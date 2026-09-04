// controllers/analyticsController.js
// PHASE 10: Sales / Purchase / Profit analytics for the Admin + Manager
// "Analytics" page. This is deliberately separate from
// adminController.js's getStockReport/getSupplierReport (which already
// cover Inventory Analytics - total products, stock value, low/out of
// stock breakdowns) so those don't get duplicated here.
//
// All the grouping/summing below happens in plain JavaScript after one
// `.find()` per collection, rather than as one giant MongoDB aggregation
// pipeline - the project's own stated goal is "beginner-friendly,
// readable and modular" code, and at this project's scale (hundreds to
// low thousands of sales/purchases) looping in JS is simple to read,
// simple to modify, and not a performance concern.

const asyncHandler = require('../utils/asyncHandler');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Category = require('../models/Category');

// Returns the Monday-based ISO week label for a date, e.g. "2026-W05" -
// used to group sales into weekly buckets for the spec's "weekly sales"
// requirement.
function isoWeekLabel(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday (0) -> 7, so weeks run Mon-Sun
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// @desc   Sales analytics: daily/weekly/monthly totals, order count, top-selling products
// @route  GET /api/admin/analytics/sales
// @access Private (Admin + Manager, per ANALYTICS_VIEW)
const getSalesAnalytics = asyncHandler(async (req, res) => {
  const sales = await Sale.find({ status: 'completed' })
    .populate('items.product', 'name sku')
    .select('items totalAmount createdAt')
    .lean();

  const dailyMap = new Map();
  const weeklyMap = new Map();
  const monthlyMap = new Map();
  const productMap = new Map();
  let totalRevenue = 0;

  const bump = (map, key, amount) => {
    const existing = map.get(key) || { total: 0, count: 0 };
    existing.total += amount;
    existing.count += 1;
    map.set(key, existing);
  };

  sales.forEach((sale) => {
    const createdAt = new Date(sale.createdAt);
    const day = createdAt.toISOString().slice(0, 10);
    const month = createdAt.toISOString().slice(0, 7);
    const week = isoWeekLabel(createdAt);

    totalRevenue += sale.totalAmount;
    bump(dailyMap, day, sale.totalAmount);
    bump(weeklyMap, week, sale.totalAmount);
    bump(monthlyMap, month, sale.totalAmount);

    sale.items.forEach((item) => {
      const productId = String(item.product?._id || item.product);
      const existing = productMap.get(productId) || {
        name: item.product?.name || 'Unknown product',
        sku: item.product?.sku || '',
        quantitySold: 0,
        revenue: 0,
      };
      existing.quantitySold += item.quantity;
      existing.revenue += item.subtotal;
      productMap.set(productId, existing);
    });
  });

  const toSortedArray = (map, keyName) =>
    Array.from(map.entries())
      .map(([key, value]) => ({ [keyName]: key, ...value }))
      .sort((a, b) => a[keyName].localeCompare(b[keyName]));

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 10);

  res.status(200).json({
    success: true,
    analytics: {
      totalOrders: sales.length,
      totalRevenue,
      daily: toSortedArray(dailyMap, 'date').slice(-30), // last 30 days with activity
      weekly: toSortedArray(weeklyMap, 'week').slice(-12), // last 12 weeks with activity
      monthly: toSortedArray(monthlyMap, 'month').slice(-12), // last 12 months with activity
      topProducts,
    },
  });
});

// @desc   Purchase analytics: totals, supplier-wise breakdown, monthly trend
// @route  GET /api/admin/analytics/purchases
// @access Private (Admin + Manager, per ANALYTICS_VIEW)
const getPurchaseAnalytics = asyncHandler(async (req, res) => {
  // Only RECEIVED purchases count as real spend - a 'pending' purchase
  // order hasn't actually cost anything yet.
  const purchases = await Purchase.find({ status: 'received' })
    .populate('supplier', 'name')
    .select('supplier totalAmount receivedDate createdAt')
    .lean();

  const supplierMap = new Map();
  const monthlyMap = new Map();
  let totalValue = 0;

  purchases.forEach((purchase) => {
    totalValue += purchase.totalAmount;

    const supplierName = purchase.supplier?.name || 'Unknown Supplier';
    const supplierEntry = supplierMap.get(supplierName) || { count: 0, total: 0 };
    supplierEntry.count += 1;
    supplierEntry.total += purchase.totalAmount;
    supplierMap.set(supplierName, supplierEntry);

    const month = new Date(purchase.receivedDate || purchase.createdAt).toISOString().slice(0, 7);
    const monthEntry = monthlyMap.get(month) || { count: 0, total: 0 };
    monthEntry.count += 1;
    monthEntry.total += purchase.totalAmount;
    monthlyMap.set(month, monthEntry);
  });

  const supplierWise = Array.from(supplierMap.entries())
    .map(([supplier, value]) => ({ supplier, ...value }))
    .sort((a, b) => b.total - a.total);

  const monthly = Array.from(monthlyMap.entries())
    .map(([month, value]) => ({ month, ...value }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  res.status(200).json({
    success: true,
    analytics: {
      totalPurchases: purchases.length,
      totalValue,
      supplierWise,
      monthly,
    },
  });
});

// @desc   Profit analytics: product/category/monthly profit, selling price
//         vs purchase price
// @route  GET /api/admin/analytics/profit
// @access Private (Admin + Manager, per ANALYTICS_VIEW)
//
// IMPORTANT LIMITATION (documented, not hidden): the Product model still
// stores one `price` (see Phase 6/8 handoff notes on the open
// purchasePrice/sellingPrice decision), so "cost" here is calculated as
// each product's AVERAGE purchasePrice across every RECEIVED purchase
// order line, weighted by quantity. A product that was only ever created
// manually or adjusted (never actually purchased through the system) has
// no cost data and shows profit == revenue, which overstates its margin.
// The response includes a `note` field, and the frontend surfaces it
// directly instead of presenting the numbers as more certain than they are.
const getProfitAnalytics = asyncHandler(async (req, res) => {
  const [purchases, sales, categories] = await Promise.all([
    Purchase.find({ status: 'received' }).select('items').lean(),
    Sale.find({ status: 'completed' }).populate('items.product', 'name category').select('items createdAt').lean(),
    Category.find().select('name').lean(),
  ]);

  // Weighted-average purchase price per product across all received purchases.
  const costAccumulator = new Map(); // productId -> { totalQty, totalCost }
  purchases.forEach((purchase) => {
    purchase.items.forEach((item) => {
      const productId = String(item.product);
      const existing = costAccumulator.get(productId) || { totalQty: 0, totalCost: 0 };
      existing.totalQty += item.quantity;
      existing.totalCost += item.subtotal;
      costAccumulator.set(productId, existing);
    });
  });
  const avgCostByProduct = new Map();
  costAccumulator.forEach((value, productId) => {
    avgCostByProduct.set(productId, value.totalCost / value.totalQty);
  });

  const categoryNameById = new Map(categories.map((c) => [String(c._id), c.name]));

  const productMap = new Map();
  const categoryMap = new Map();
  const monthlyMap = new Map();
  let totalRevenue = 0;
  let totalCost = 0;
  let hasUnknownCostProduct = false;

  sales.forEach((sale) => {
    const month = new Date(sale.createdAt).toISOString().slice(0, 7);

    sale.items.forEach((item) => {
      const productId = String(item.product?._id || item.product);
      const unitCost = avgCostByProduct.get(productId);
      if (unitCost === undefined) hasUnknownCostProduct = true;
      const cost = (unitCost || 0) * item.quantity;
      const revenue = item.subtotal;
      const profit = revenue - cost;

      totalRevenue += revenue;
      totalCost += cost;

      const productEntry = productMap.get(productId) || {
        name: item.product?.name || 'Unknown product',
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      productEntry.revenue += revenue;
      productEntry.cost += cost;
      productEntry.profit += profit;
      productMap.set(productId, productEntry);

      const categoryId = item.product?.category ? String(item.product.category) : 'uncategorized';
      const categoryEntry = categoryMap.get(categoryId) || { revenue: 0, cost: 0, profit: 0 };
      categoryEntry.revenue += revenue;
      categoryEntry.cost += cost;
      categoryEntry.profit += profit;
      categoryMap.set(categoryId, categoryEntry);

      const monthEntry = monthlyMap.get(month) || { revenue: 0, cost: 0, profit: 0 };
      monthEntry.revenue += revenue;
      monthEntry.cost += cost;
      monthEntry.profit += profit;
      monthlyMap.set(month, monthEntry);
    });
  });

  const productWise = Array.from(productMap.values()).sort((a, b) => b.profit - a.profit);

  const categoryWise = Array.from(categoryMap.entries())
    .map(([categoryId, value]) => ({
      category: categoryNameById.get(categoryId) || 'Uncategorized',
      ...value,
    }))
    .sort((a, b) => b.profit - a.profit);

  const monthly = Array.from(monthlyMap.entries())
    .map(([month, value]) => ({ month, ...value }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  res.status(200).json({
    success: true,
    analytics: {
      totals: { totalRevenue, totalCost, totalProfit: totalRevenue - totalCost },
      productWise,
      categoryWise,
      monthly,
      note: hasUnknownCostProduct
        ? 'Some sold products have no purchase history in the system, so their cost is shown as 0 - their profit may be overstated.'
        : null,
    },
  });
});

module.exports = {
  getSalesAnalytics,
  getPurchaseAnalytics,
  getProfitAnalytics,
};
