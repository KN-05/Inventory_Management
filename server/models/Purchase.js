// models/Purchase.js
// PHASE 7: a Purchase Order placed with a Supplier for one or more
// products. Workflow:
//   1. Admin/Manager creates a Purchase - status starts 'pending'.
//      Nothing happens to stock yet - it's just a record of what was
//      ordered.
//   2. When the goods actually arrive, someone marks it 'received'
//      (POST /purchases/:id/receive). ONLY at that point does stock
//      increase and a StockMovement get written per line item - this
//      matches the spec: "When a purchase is received: STOCK MUST
//      AUTOMATICALLY INCREASE."
// `paymentStatus` is tracked separately from `status` (received/pending)
// because a supplier invoice is very often paid before or after the
// goods physically arrive - the two shouldn't be coupled together.

const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: [0, 'Purchase price cannot be negative'],
    },
    // quantity * purchasePrice, stored so historical line totals never
    // shift even if the product's own price changes later.
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    items: {
      type: [purchaseItemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'A purchase must have at least one product line item',
      },
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative'],
    },
    // sum(item.subtotal) - discount + tax. Recalculated server-side on
    // every create/update - never trusted from the client.
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
    },
    status: {
      type: String,
      enum: ['pending', 'received', 'cancelled'],
      default: 'pending',
    },
    receivedDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Purchases are almost always listed "most recent first" and filtered by
// supplier/status - index accordingly.
purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ supplier: 1, createdAt: -1 });

// PHASE 7: builds a purchase order number like "PO-2026-000001" - year +
// a zero-padded sequence, mirroring Product's SKU generation pattern in
// spirit (see Product.buildSkuCandidate).
purchaseSchema.statics.buildPurchaseNumberCandidate = function (sequence) {
  const year = new Date().getFullYear();
  const paddedSequence = String(sequence).padStart(6, '0');
  return `PO-${year}-${paddedSequence}`;
};

module.exports = mongoose.model('Purchase', purchaseSchema);
