// controllers/saleController.js
// PHASE 8: the sales/checkout flow. See models/Sale.js for why a sale is
// created atomically-completed rather than having a pending step like
// Purchase does.

const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');
const createNotification = require('../utils/createNotification');
const { generateUniqueInvoiceNumber } = require('../utils/generateInvoiceNumber');
const toCsv = require('../utils/toCsv');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const StockMovement = require('../models/StockMovement');

// @desc   Get all sales, with optional filters + pagination
// @route  GET /api/sales?customer=&status=&search=&page=&limit=
// @access Private (Admin + Manager + Staff, per SALES_VIEW)
const getSales = asyncHandler(async (req, res) => {
  const { customer, status, search, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (customer) filter.customer = customer;
  if (status) filter.status = status;
  if (search) filter.invoiceNumber = { $regex: search, $options: 'i' };

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNum - 1) * limitNum;

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate('customer', 'name phone')
      .populate('items.product', 'name sku')
      .populate('soldBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Sale.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: sales.length,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    sales,
  });
});

// @desc   Get a single sale by id (used for the invoice view)
// @route  GET /api/sales/:id
// @access Private (Admin + Manager + Staff, per SALES_VIEW)
const getSaleById = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate('customer', 'name phone email address city')
    .populate('items.product', 'name sku barcode')
    .populate('soldBy', 'name');

  if (!sale) {
    res.status(404);
    throw new Error('Sale not found');
  }

  res.status(200).json({ success: true, sale });
});

// @desc   Create (checkout) a sale: validates stock, decreases it,
//         writes a StockMovement per item, updates the customer's
//         totals, and generates the invoice - all in one request.
// @route  POST /api/sales
// @access Private (Admin + Manager + Staff, per SALES_CREATE)
const createSale = asyncHandler(async (req, res) => {
  const { customer, items, discount = 0, tax = 0, paymentMethod, paymentStatus } = req.body;

  let customerDoc = null;
  if (customer) {
    customerDoc = await Customer.findById(customer);
    if (!customerDoc) {
      res.status(400);
      throw new Error('Customer not found');
    }
  }

  // Load every referenced product up front and validate stock BEFORE
  // changing anything - this is what "prevent selling more quantity than
  // available stock" means: check everything first, then commit, so a
  // sale never partially succeeds.
  const products = await Product.find({ _id: { $in: items.map((i) => i.product) } });
  const productById = new Map(products.map((p) => [String(p._id), p]));

  const computedItems = [];
  for (const item of items) {
    const product = productById.get(String(item.product));
    if (!product) {
      res.status(400);
      throw new Error('One or more selected products could not be found');
    }
    const quantity = Number(item.quantity);
    if (product.quantity < quantity) {
      res.status(400);
      throw new Error(
        `Not enough stock for "${product.name}" - only ${product.quantity} available, ${quantity} requested`
      );
    }
    // Default to the product's current price; allow an explicit
    // per-line override (e.g. a point-of-sale discount on one item).
    const sellingPrice =
      item.sellingPrice !== undefined && item.sellingPrice !== null
        ? Number(item.sellingPrice)
        : product.price;

    computedItems.push({
      product: product._id,
      quantity,
      sellingPrice,
      subtotal: quantity * sellingPrice,
      _productDoc: product, // kept only for the loop below, stripped before save
    });
  }

  const itemsTotal = computedItems.reduce((sum, i) => sum + i.subtotal, 0);
  const totalAmount = Math.max(itemsTotal - Number(discount || 0) + Number(tax || 0), 0);
  const invoiceNumber = await generateUniqueInvoiceNumber();

  const sale = await Sale.create({
    invoiceNumber,
    customer: customer || null,
    items: computedItems.map(({ _productDoc, ...rest }) => rest),
    discount,
    tax,
    totalAmount,
    paymentMethod,
    paymentStatus,
    soldBy: req.user._id,
  });

  // Now actually decrease stock + write StockMovement records. Sequential
  // on purpose - see the identical reasoning in purchaseController.js's
  // receivePurchase (predictable ordering, easy-to-reason-about partial
  // failure, and each product.save() triggers the stock-alert hook).
  for (const item of computedItems) {
    const product = item._productDoc;
    const previousStock = product.quantity;
    product.quantity -= item.quantity;
    await product.save(); // eslint-disable-line no-await-in-loop -- status/alerts recalculated automatically

    await StockMovement.create({
      // eslint-disable-line no-await-in-loop
      product: product._id,
      type: 'SALE',
      quantity: -item.quantity, // negative: stock going OUT
      previousStock,
      newStock: product.quantity,
      reason: 'Sold to customer',
      reference: sale.invoiceNumber,
      performedBy: req.user._id,
    });
  }

  if (customerDoc) {
    customerDoc.totalPurchases += totalAmount;
    customerDoc.lastPurchase = new Date();
    await customerDoc.save();
  }

  await logActivity(
    req.user._id,
    `Completed sale "${sale.invoiceNumber}" for ${formatAmount(totalAmount)}`,
    'sale'
  );
  await createNotification('admin', 'new_sale', `New sale ${sale.invoiceNumber} completed`, '/sales');

  const populated = await Sale.findById(sale._id)
    .populate('customer', 'name phone')
    .populate('items.product', 'name sku')
    .populate('soldBy', 'name');

  res.status(201).json({ success: true, message: 'Sale completed', sale: populated });
});

// @desc   Cancel a completed sale: restores stock for every line item
//         (StockMovement type RETURN) and reverses the customer's totals.
// @route  POST /api/sales/:id/cancel
// @access Private (Admin only)
const cancelSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) {
    res.status(404);
    throw new Error('Sale not found');
  }
  if (sale.status === 'cancelled') {
    res.status(400);
    throw new Error('This sale has already been cancelled');
  }

  for (const item of sale.items) {
    const product = await Product.findById(item.product); // eslint-disable-line no-await-in-loop
    if (!product) continue; // product may have been deleted since the sale was made

    const previousStock = product.quantity;
    product.quantity += item.quantity;
    await product.save(); // eslint-disable-line no-await-in-loop

    await StockMovement.create({
      // eslint-disable-line no-await-in-loop
      product: product._id,
      type: 'RETURN',
      quantity: item.quantity, // positive: stock coming back IN
      previousStock,
      newStock: product.quantity,
      reason: 'Sale cancelled',
      reference: sale.invoiceNumber,
      performedBy: req.user._id,
    });
  }

  if (sale.customer) {
    const customerDoc = await Customer.findById(sale.customer);
    if (customerDoc) {
      customerDoc.totalPurchases = Math.max(customerDoc.totalPurchases - sale.totalAmount, 0);
      await customerDoc.save();
    }
  }

  sale.status = 'cancelled';
  await sale.save();

  await logActivity(
    req.user._id,
    `Cancelled sale "${sale.invoiceNumber}" - stock restored for ${sale.items.length} product(s)`,
    'sale'
  );

  res.status(200).json({ success: true, message: 'Sale cancelled and stock restored', sale });
});

function formatAmount(amount) {
  return `Rs. ${Number(amount).toFixed(2)}`;
}

// @desc   Export all sales as a CSV file - one row per line item, since a
//         single sale can contain multiple products
// @route  GET /api/sales/export
// @access Private (Admin + Manager + Staff, per SALES_VIEW)
const exportSales = asyncHandler(async (req, res) => {
  const sales = await Sale.find()
    .populate('customer', 'name')
    .populate('items.product', 'name sku')
    .populate('soldBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  // Flatten to one row per (sale, line item) pair - a plain CSV can't
  // represent a sale's nested item array any other way.
  const rows = sales.flatMap((sale) =>
    sale.items.map((item) => ({
      invoiceNumber: sale.invoiceNumber,
      date: new Date(sale.createdAt).toISOString(),
      customer: sale.customer?.name || 'Walk-in',
      product: item.product?.name || 'Unknown product',
      sku: item.product?.sku || '',
      quantity: item.quantity,
      sellingPrice: item.sellingPrice,
      subtotal: item.subtotal,
      saleTotal: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      status: sale.status,
      soldBy: sale.soldBy?.name || '',
    }))
  );

  const csv = toCsv(rows, [
    { key: 'invoiceNumber', label: 'Invoice Number' },
    { key: 'date', label: 'Date' },
    { key: 'customer', label: 'Customer' },
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'sellingPrice', label: 'Unit Price' },
    { key: 'subtotal', label: 'Line Subtotal' },
    { key: 'saleTotal', label: 'Sale Total' },
    { key: 'paymentMethod', label: 'Payment Method' },
    { key: 'paymentStatus', label: 'Payment Status' },
    { key: 'status', label: 'Status' },
    { key: 'soldBy', label: 'Sold By' },
  ]);

  await logActivity(req.user._id, `Exported ${sales.length} sale(s) to CSV`, 'sale');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sales-export.csv"');
  res.status(200).send(csv);
});

module.exports = {
  getSales,
  getSaleById,
  createSale,
  cancelSale,
  exportSales,
};
