// controllers/purchaseController.js
// PHASE 7: full Purchase Order lifecycle - create (pending) -> receive
// (increases stock + writes StockMovement records) -> track payment
// status separately. See models/Purchase.js for the workflow rationale.

const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');
const createNotification = require('../utils/createNotification');
const { generateUniquePurchaseNumber } = require('../utils/generatePurchaseNumber');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');

// Recomputes each line item's subtotal + the purchase's totalAmount from
// scratch, server-side - never trusts totals sent by the client.
function computeTotals(items, discount, tax) {
  const computedItems = items.map((item) => ({
    product: item.product,
    quantity: Number(item.quantity),
    purchasePrice: Number(item.purchasePrice),
    subtotal: Number(item.quantity) * Number(item.purchasePrice),
  }));
  const itemsTotal = computedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalAmount = Math.max(itemsTotal - Number(discount || 0) + Number(tax || 0), 0);
  return { computedItems, totalAmount };
}

// @desc   Get all purchases, with optional filters + pagination
// @route  GET /api/purchases?supplier=&status=&paymentStatus=&search=&page=&limit=
// @access Private (Admin + Manager, per PURCHASES_VIEW)
const getPurchases = asyncHandler(async (req, res) => {
  const { supplier, status, paymentStatus, search, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (supplier) filter.supplier = supplier;
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) filter.purchaseNumber = { $regex: search, $options: 'i' };

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNum - 1) * limitNum;

  const [purchases, total] = await Promise.all([
    Purchase.find(filter)
      .populate('supplier', 'name companyName')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Purchase.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: purchases.length,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    purchases,
  });
});

// @desc   Get a single purchase by id
// @route  GET /api/purchases/:id
// @access Private (Admin + Manager, per PURCHASES_VIEW)
const getPurchaseById = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id)
    .populate('supplier', 'name companyName email phone')
    .populate('items.product', 'name sku image')
    .populate('createdBy', 'name');

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase not found');
  }

  res.status(200).json({ success: true, purchase });
});

// @desc   Create a purchase order (status starts 'pending' - stock is
//         NOT affected until it's received)
// @route  POST /api/purchases
// @access Private (Admin + Manager, per PURCHASES_CREATE)
const createPurchase = asyncHandler(async (req, res) => {
  const { supplier, items, discount = 0, tax = 0 } = req.body;

  const supplierDoc = await Supplier.findById(supplier);
  if (!supplierDoc) {
    res.status(400);
    throw new Error('Supplier not found');
  }

  // Make sure every referenced product actually exists before creating
  // the purchase - a typo'd product id should fail loudly, not silently
  // create a purchase line pointing at nothing.
  const productIds = items.map((i) => i.product);
  const foundCount = await Product.countDocuments({ _id: { $in: productIds } });
  if (foundCount !== new Set(productIds.map(String)).size) {
    res.status(400);
    throw new Error('One or more selected products could not be found');
  }

  const { computedItems, totalAmount } = computeTotals(items, discount, tax);
  const purchaseNumber = await generateUniquePurchaseNumber();

  const purchase = await Purchase.create({
    purchaseNumber,
    supplier,
    items: computedItems,
    discount,
    tax,
    totalAmount,
    createdBy: req.user._id,
  });

  await logActivity(
    req.user._id,
    `Created purchase order "${purchase.purchaseNumber}" for supplier "${supplierDoc.name}"`,
    'purchase'
  );
  await createNotification(
    'admin',
    'new_purchase',
    `New purchase order ${purchase.purchaseNumber} created (${supplierDoc.name})`,
    '/purchases'
  );

  res.status(201).json({ success: true, message: 'Purchase order created', purchase });
});

// @desc   Update a purchase order (items/discount/tax) - only while it's
//         still 'pending', to keep stock history unambiguous
// @route  PUT /api/purchases/:id
// @access Private (Admin + Manager, per PURCHASES_UPDATE)
const updatePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) {
    res.status(404);
    throw new Error('Purchase not found');
  }

  if (purchase.status !== 'pending') {
    res.status(400);
    throw new Error(`Cannot edit a purchase that is already "${purchase.status}"`);
  }

  const { supplier, items, discount, tax, paymentStatus } = req.body;

  if (supplier !== undefined) {
    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) {
      res.status(400);
      throw new Error('Supplier not found');
    }
    purchase.supplier = supplier;
  }

  if (items !== undefined) {
    const productIds = items.map((i) => i.product);
    const foundCount = await Product.countDocuments({ _id: { $in: productIds } });
    if (foundCount !== new Set(productIds.map(String)).size) {
      res.status(400);
      throw new Error('One or more selected products could not be found');
    }
    const { computedItems, totalAmount } = computeTotals(
      items,
      discount ?? purchase.discount,
      tax ?? purchase.tax
    );
    purchase.items = computedItems;
    purchase.totalAmount = totalAmount;
  } else if (discount !== undefined || tax !== undefined) {
    const { totalAmount } = computeTotals(purchase.items, discount ?? purchase.discount, tax ?? purchase.tax);
    purchase.totalAmount = totalAmount;
  }

  if (discount !== undefined) purchase.discount = discount;
  if (tax !== undefined) purchase.tax = tax;
  if (paymentStatus !== undefined) purchase.paymentStatus = paymentStatus;

  const updated = await purchase.save();

  await logActivity(req.user._id, `Updated purchase order "${updated.purchaseNumber}"`, 'purchase');

  res.status(200).json({ success: true, message: 'Purchase order updated', purchase: updated });
});

// @desc   Update ONLY the payment status of a purchase - allowed
//         regardless of pending/received, since supplier invoices are
//         often paid before or after goods physically arrive
// @route  PATCH /api/purchases/:id/payment-status
// @access Private (Admin + Manager, per PURCHASES_UPDATE)
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;

  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) {
    res.status(404);
    throw new Error('Purchase not found');
  }

  purchase.paymentStatus = paymentStatus;
  await purchase.save();

  await logActivity(
    req.user._id,
    `Marked purchase "${purchase.purchaseNumber}" payment status as "${paymentStatus}"`,
    'purchase'
  );

  res.status(200).json({ success: true, message: 'Payment status updated', purchase });
});

// @desc   Mark a purchase as received: increases stock for every line
//         item and writes a StockMovement record for each one. This is
//         the ONLY place Purchase-driven stock increases happen.
// @route  POST /api/purchases/:id/receive
// @access Private (Admin + Manager, per PURCHASES_RECEIVE)
const receivePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id).populate('items.product');

  if (!purchase) {
    res.status(404);
    throw new Error('Purchase not found');
  }

  if (purchase.status === 'received') {
    res.status(400);
    throw new Error('This purchase has already been received');
  }
  if (purchase.status === 'cancelled') {
    res.status(400);
    throw new Error('Cannot receive a cancelled purchase');
  }

  // Sequential on purpose (not Promise.all) - each product save can
  // trigger the stock-alert/notification hook, and going one at a time
  // keeps the resulting activity/notification order predictable and
  // makes a partial failure easy to reason about.
  for (const item of purchase.items) {
    const product = await Product.findById(item.product._id || item.product); // eslint-disable-line no-await-in-loop
    if (!product) continue; // product may have been deleted since the purchase was created

    const previousStock = product.quantity;
    product.quantity += item.quantity;
    await product.save(); // eslint-disable-line no-await-in-loop -- status/alerts recalculated automatically

    await StockMovement.create({
      product: product._id,
      type: 'PURCHASE',
      quantity: item.quantity, // positive: stock coming IN
      previousStock,
      newStock: product.quantity,
      reason: 'Received purchase order',
      reference: purchase.purchaseNumber,
      performedBy: req.user._id,
    }); // eslint-disable-line no-await-in-loop
  }

  purchase.status = 'received';
  purchase.receivedDate = new Date();
  await purchase.save();

  await logActivity(
    req.user._id,
    `Received purchase order "${purchase.purchaseNumber}" - stock updated for ${purchase.items.length} product(s)`,
    'purchase'
  );

  res.status(200).json({ success: true, message: 'Purchase received and stock updated', purchase });
});

// @desc   Delete a purchase order - only allowed while still 'pending'
//         (a received purchase must stay as a permanent stock-history
//         record; cancel workflows aren't in scope for this phase)
// @route  DELETE /api/purchases/:id
// @access Private (Admin only)
const deletePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) {
    res.status(404);
    throw new Error('Purchase not found');
  }

  if (purchase.status !== 'pending') {
    res.status(400);
    throw new Error(`Cannot delete a purchase that is already "${purchase.status}"`);
  }

  await purchase.deleteOne();

  await logActivity(req.user._id, `Deleted purchase order "${purchase.purchaseNumber}"`, 'purchase');

  res.status(200).json({ success: true, message: 'Purchase order deleted' });
});

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  updatePaymentStatus,
  receivePurchase,
  deletePurchase,
};
