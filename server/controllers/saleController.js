// controllers/saleController.js
// PHASE 8: the sales/checkout flow. See models/Sale.js for why a sale is
// created atomically-completed rather than having a pending step like
// Purchase does.

const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { clampLimit } = require('../utils/pagination');
const logActivity = require('../utils/logActivity');
const createNotification = require('../utils/createNotification');
const { generateUniqueInvoiceNumber } = require('../utils/generateInvoiceNumber');
const toCsv = require('../utils/toCsv');
const { calculateGst, round2 } = require('../utils/gst');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const StockMovement = require('../models/StockMovement');
const { applyStockChanges, rollbackStockChanges, findStockLimitViolation } = require('../utils/stockService');

// @desc   Get all sales, with optional filters + pagination
// @route  GET /api/sales?customer=&status=&search=&page=&limit=
// @access Private (Admin + Manager + Staff, per SALES_VIEW)
const getSales = asyncHandler(async (req, res) => {
  const { customer, status, search, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (customer) filter.customer = customer;
  if (status) filter.status = status;
  if (search) filter.invoiceNumber = { $regex: escapeRegex(search), $options: 'i' };

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = clampLimit(limit, 20);
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
  // `tax` is no longer accepted from the client: GST is calculated here from each
  // product's SGST/CGST/IGST rates (see utils/gst.js), never trusted from the browser.
  const { customer, items, discount = 0, paymentMethod, paymentStatus, supplyType = 'intra' } = req.body;

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
  if (Number(discount || 0) > round2(itemsTotal)) {
    res.status(400);
    throw new Error('Discount cannot be more than the items total');
  }

  // GST: product prices are GST-INCLUSIVE MRPs, so the customer pays the MRP
  // (less any discount) and GST is worked out from inside that amount, using
  // each product's rates. Within the state that is SGST + CGST; to another
  // state it is IGST - never both. See utils/gst.js.
  const gst = calculateGst(
    computedItems.map((i) => ({
      subtotal: i.subtotal,
      sgstRate: i._productDoc.sgstRate,
      cgstRate: i._productDoc.cgstRate,
      igstRate: i._productDoc.igstRate,
    })),
    discount,
    supplyType === 'inter' ? 'inter' : 'intra'
  );
  const totalAmount = gst.totals.grandTotal;
  const invoiceNumber = await generateUniqueInvoiceNumber();

  // STEP 1 - reserve the stock. Each product is decreased with an ATOMIC
  // "take N only if at least N are there" update, so two cashiers selling the
  // last unit at the same moment can never both succeed (the check above is
  // only for a friendly early message; this is the real guard). If any line
  // fails, the lines already taken are put back and nothing is sold.
  const reservation = await applyStockChanges(
    computedItems.map((item) => ({ productId: item.product, delta: -item.quantity }))
  );
  if (reservation.error) {
    res.status(400);
    throw new Error(
      reservation.error.status === 404
        ? 'One or more selected products could not be found'
        : 'Not enough stock - another sale just used it. Please refresh and try again.'
    );
  }

  // STEP 2 - write the sale. If this fails, give the stock back.
  let sale;
  try {
    sale = await Sale.create({
      invoiceNumber,
      customer: customer || null,
      items: computedItems.map(({ _productDoc, ...rest }, index) => ({ ...rest, ...gst.lines[index] })),
      discount: gst.totals.discount,
      tax: gst.totals.gstTotal,
      gstApplied: true,
      gstMode: 'inclusive',
      supplyType: supplyType === 'inter' ? 'inter' : 'intra',
      taxableTotal: gst.totals.taxableTotal,
      totalSgst: gst.totals.sgstTotal,
      totalCgst: gst.totals.cgstTotal,
      totalIgst: gst.totals.igstTotal,
      totalAmount,
      paymentMethod,
      paymentStatus,
      soldBy: req.user._id,
    });
  } catch (err) {
    await rollbackStockChanges(reservation.applied);
    throw err;
  }

  // STEP 3 - stock history, one StockMovement per line.
  for (const change of reservation.applied) {
    await StockMovement.create({
      // eslint-disable-line no-await-in-loop
      product: change.product._id,
      type: 'SALE',
      quantity: change.delta, // negative: stock going OUT
      previousStock: change.previousStock,
      newStock: change.product.quantity,
      reason: 'Sold to customer',
      reference: sale.invoiceNumber,
      performedBy: req.user._id,
    });
  }

  if (customerDoc) {
    // atomic increment - two simultaneous sales to one customer both count
    await Customer.updateOne(
      { _id: customerDoc._id },
      { $inc: { totalPurchases: totalAmount }, $set: { lastPurchase: new Date() } }
    );
  }

  await logActivity(
    req.user._id,
    `Completed sale "${sale.invoiceNumber}" for ${formatAmount(totalAmount)}`,
    'sale'
  );
  // PHASE 11 FIX: previously only notified 'admin' - Manager needs the
  // same visibility into Sales as Purchases (same reasoning as the
  // identical fix in purchaseController.js's createPurchase).
  await createNotification('admin', 'new_sale', `New sale ${sale.invoiceNumber} completed`, '/sales');
  await createNotification('manager', 'new_sale', `New sale ${sale.invoiceNumber} completed`, '/sales');

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
  // Claim the cancellation atomically: only ONE request can flip
  // completed -> cancelled, so pressing "Cancel" twice (or two people at
  // once) can never restore the stock twice.
  const sale = await Sale.findOneAndUpdate(
    { _id: req.params.id, status: 'completed' },
    { status: 'cancelled' },
    { new: true }
  );
  if (!sale) {
    const exists = await Sale.exists({ _id: req.params.id });
    res.status(exists ? 400 : 404);
    throw new Error(exists ? 'This sale has already been cancelled' : 'Sale not found');
  }
  const reopen = () => Sale.updateOne({ _id: sale._id }, { status: 'completed' });

  // LIMITS: restoring stock is also a stock increase - it may not push any
  // product above 1000 units. Checked for every line before anything changes.
  const limitViolation = await findStockLimitViolation(
    sale.items.map((item) => ({ product: item.product, quantity: item.quantity }))
  );
  if (limitViolation) {
    await reopen();
    res.status(400);
    throw new Error(`Cannot cancel this sale: ${limitViolation}`);
  }

  // all-or-nothing: if one product refuses, the others are rolled back too
  const restoration = await applyStockChanges(
    sale.items.map((item) => ({ productId: item.product, delta: Number(item.quantity) })),
    { skipMissing: true } // a product may have been deleted since the sale was made
  );
  if (restoration.error) {
    await reopen();
    res.status(restoration.error.status);
    throw new Error(`Cannot cancel this sale: ${restoration.error.message}`);
  }

  for (const change of restoration.applied) {
    await StockMovement.create({
      // eslint-disable-line no-await-in-loop
      product: change.product._id,
      type: 'RETURN',
      quantity: change.delta, // positive: stock coming back IN
      previousStock: change.previousStock,
      newStock: change.product.quantity,
      reason: 'Sale cancelled',
      reference: sale.invoiceNumber,
      performedBy: req.user._id,
    });
  }

  if (sale.customer) {
    // never below zero, and atomic
    await Customer.updateOne({ _id: sale.customer }, [
      { $set: { totalPurchases: { $max: [{ $subtract: ['$totalPurchases', sale.totalAmount] }, 0] } } },
    ]);
  }

  await logActivity(
    req.user._id,
    `Cancelled sale "${sale.invoiceNumber}" - stock restored for ${sale.items.length} product(s)`,
    'sale'
  );
  // PHASE 11: a cancelled sale reverses real stock/financial impact -
  // worth flagging to both roles, same as a purchase being received.
  await createNotification(
    'admin',
    'sale_cancelled',
    `Sale "${sale.invoiceNumber}" was cancelled - stock restored`,
    '/sales'
  );
  await createNotification(
    'manager',
    'sale_cancelled',
    `Sale "${sale.invoiceNumber}" was cancelled - stock restored`,
    '/sales'
  );

  res.status(200).json({ success: true, message: 'Sale cancelled and stock restored', sale });
});

// PHASE 14 CONSISTENCY FIX: was "Rs. 500.00" - the rest of the app
// (formatCurrency.js on the frontend) always shows "₹500.00". This string
// only ever appears inside an ActivityLog message, but there's no reason
// for it to look different from every other money value in the system.
function formatAmount(amount) {
  return `₹${Number(amount).toFixed(2)}`;
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
      taxableValue: item.taxableValue,
      sgstAmount: item.sgstAmount,
      cgstAmount: item.cgstAmount,
      igstAmount: item.igstAmount,
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
    { key: 'taxableValue', label: 'Taxable Value' },
    { key: 'sgstAmount', label: 'SGST' },
    { key: 'cgstAmount', label: 'CGST' },
    { key: 'igstAmount', label: 'IGST' },
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
