// models/StockMovement.js
// PHASE 7: an audit trail of every stock change, so users can see WHY a
// product's quantity is what it is (per the spec: "Users should be able
// to see why stock changed"). Written whenever stock actually changes -
// currently from receiving a Purchase (type PURCHASE) - future phases
// (Sales, manual adjustments) will write their own types here too.
//
// `quantity` is signed: positive for stock coming IN (purchase, return),
// negative for stock going OUT (sale, damage, transfer-out), so a plain
// sum of `quantity` for a product always equals its net stock change.

const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    type: {
      type: String,
      enum: ['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGE', 'TRANSFER'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    // Free-text pointer back to the source document, e.g. a purchase
    // number ("PO-2026-000001") or, later, an invoice number. Not a
    // proper ObjectId ref since the source type varies by movement type.
    reference: {
      type: String,
      trim: true,
      default: '',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Movements are read far more often than written, and are almost always
// looked up "for this product, most recent first" - index accordingly.
stockMovementSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
