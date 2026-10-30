// utils/stockService.js
// ONE place that changes a product's stock level. Every path that adds or
// removes stock (manual increase/decrease, purchase receive, sale cancel)
// should go through here so the 0..1000 limit is enforced the same way and
// - importantly - ATOMICALLY.
//
// Why atomic: reading `product.quantity`, adding to it in JS and saving is a
// race. Two requests at stock 900 that both add 100 would each see 900 and
// both save 1000 (or both pass a "<= 1000" check and end at 1100). Here the
// limit is part of the MongoDB update filter, so the database itself refuses
// the second write:
//
//   increase:  update WHERE quantity <= 1000 - delta   SET quantity += delta
//   decrease:  update WHERE quantity >= delta          SET quantity -= delta
//
// Existing products that are ALREADY above the limit are never modified by
// this module except to decrease them; increasing them is rejected.

const Product = require('../models/Product');
const {
  MAX_QUANTITY,
  QUANTITY_MESSAGE,
  increaseExceedsLimitMessage,
} = require('./productLimits');

// Returns { product, previousStock } on success, or
// { error: { status, message } } when the change is not allowed.
async function applyStockChange(productId, delta) {
  const filter = { _id: productId };
  filter.quantity = delta > 0 ? { $lte: MAX_QUANTITY - delta } : { $gte: -delta };

  const updated = await Product.findOneAndUpdate(filter, { $inc: { quantity: delta } }, { returnDocument: 'after' });

  if (updated) {
    // Keep `status` + stock alerts in sync. save() runs the model's pre/post
    // hooks; only `status` changes here, quantity was already written above.
    updated.status = updated.calculateStatus();
    await updated.save();
    return { product: updated, previousStock: updated.quantity - delta };
  }

  // Not updated: either the product does not exist or the rule blocked it.
  const current = await Product.findById(productId).select('quantity name');
  if (!current) return { error: { status: 404, message: 'Product not found' } };

  if (delta > 0) {
    return { error: { status: 400, message: increaseExceedsLimitMessage(current.quantity, delta) } };
  }
  return { error: { status: 400, message: 'Cannot decrease stock below 0' } };
}

// Read-only pre-check for multi-line operations (purchase receive, sale
// cancel). `increases` is [{ product: id, quantity: n }, ...]; several lines
// for the same product are added together. Returns an error message string
// or null. Nothing is written.
async function findStockLimitViolation(increases) {
  const totals = new Map();
  for (const line of increases) {
    const key = String(line.product);
    totals.set(key, (totals.get(key) || 0) + Number(line.quantity));
  }
  for (const [productId, add] of totals) {
    // eslint-disable-next-line no-await-in-loop
    const product = await Product.findById(productId).select('quantity name');
    if (!product) continue; // deleted products are skipped by the callers already
    if (product.quantity + add > MAX_QUANTITY) {
      return (
        `${QUANTITY_MESSAGE} "${product.name}" has ${product.quantity} in stock; ` +
        `adding ${add} would make it ${product.quantity + add}.`
      );
    }
  }
  return null;
}

// Undo stock changes that were already applied (newest first). Used when a
// LATER step of the same operation fails, so a sale/purchase never leaves
// stock half-changed. It adds/removes the exact amounts directly (no 0..1000
// check - we are putting back what we took).
async function rollbackStockChanges(applied) {
  for (const change of [...applied].reverse()) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await Product.updateOne({ _id: change.productId }, { $inc: { quantity: -change.delta } });
      // eslint-disable-next-line no-await-in-loop
      const product = await Product.findById(change.productId);
      if (product) {
        product.status = product.calculateStatus();
        // eslint-disable-next-line no-await-in-loop
        await product.save();
      }
    } catch (err) {
      // Nothing more we can do here - make the problem visible to the operator.
      console.error(`[stock] FAILED to roll back ${change.delta} units on product ${change.productId}: ${err.message}`);
    }
  }
}

// Apply several stock changes as ONE all-or-nothing operation:
//   changes = [{ productId, delta }]   (delta > 0 adds, delta < 0 removes)
// Every change is atomic on its own (see applyStockChange). If any change is
// refused, the ones already applied are rolled back and { error } is
// returned. A product that no longer exists is skipped when skipMissing is
// true, and counts as a failure otherwise.
// On success: { applied: [{ productId, delta, product, previousStock }] }.
async function applyStockChanges(changes, { skipMissing = false } = {}) {
  const applied = [];
  for (const change of changes) {
    // eslint-disable-next-line no-await-in-loop
    const result = await applyStockChange(change.productId, change.delta);
    if (result.error) {
      if (result.error.status === 404 && skipMissing) continue;
      // eslint-disable-next-line no-await-in-loop
      await rollbackStockChanges(applied);
      return { error: result.error };
    }
    applied.push({
      productId: change.productId,
      delta: change.delta,
      product: result.product,
      previousStock: result.previousStock,
    });
  }
  return { applied };
}

module.exports = { applyStockChange, applyStockChanges, rollbackStockChanges, findStockLimitViolation };
