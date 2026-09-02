// controllers/dashboardController.js
// Powers the Dashboard page. Every number here comes from a real MongoDB
// query/aggregation - nothing is hardcoded or faked.

const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Category = require('../models/Category');
const ActivityLog = require('../models/ActivityLog');
const StockAlert = require('../models/StockAlert');

// @desc   Get dashboard summary: totals, stock value, status breakdown,
//         recent activity
// @route  GET /api/dashboard/summary
// @access Private (Admin, Manager, Staff - see PHASE 5 note below)
//
// PHASE 5: Staff must not receive financial data (spec: "Staff - Not
// allowed: ... Profit/loss information, Sales financial summaries").
// `totalStockValue` is a monetary figure (sum of quantity * price), so it
// is stripped from the response for the 'staff' role here in the
// controller - not just hidden in the UI - so a Staff user calling this
// API directly (e.g. via devtools/curl) still cannot read it out.
const getDashboardSummary = asyncHandler(async (req, res) => {
  const [
    totalProducts,
    totalSuppliers,
    totalCategories,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    stockValueResult,
    categoryBreakdown,
    recentActivities,
    activeAlertsCount,
  ] = await Promise.all([
    Product.countDocuments(),
    Supplier.countDocuments(),
    Category.countDocuments(),
    Product.countDocuments({ status: 'In Stock' }),
    Product.countDocuments({ status: 'Low Stock' }),
    Product.countDocuments({ status: 'Out of Stock' }),

    // Total stock value = sum(quantity * price) across all products.
    // $multiply happens per-document inside the aggregation pipeline,
    // then $sum adds all of those up into a single number.
    Product.aggregate([
      { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantity', '$price'] } } } },
    ]),

    // Product count grouped by category, for a simple bar chart.
    Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          category: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] },
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]),

    ActivityLog.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name'),
    StockAlert.countDocuments({ status: 'active' }),
  ]);

  const totalStockValue = stockValueResult[0]?.totalValue || 0;
  const isStaff = req.user.role === 'staff';

  res.status(200).json({
    success: true,
    summary: {
      totalProducts,
      totalSuppliers,
      totalCategories,
      // PHASE 5: omit this monetary figure from the Staff response - see
      // note above the function.
      ...(isStaff ? {} : { totalStockValue }),
      activeAlertsCount,
      stockStatusBreakdown: {
        inStock: inStockCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
      categoryBreakdown,
      recentActivities: recentActivities.map((log) => ({
        id: log._id,
        user: log.user?.name || 'Unknown user',
        action: log.action,
        module: log.module,
        createdAt: log.createdAt,
      })),
    },
  });
});

module.exports = { getDashboardSummary };
