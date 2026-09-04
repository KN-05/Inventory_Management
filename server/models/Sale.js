// models/Sale.js
// PHASE 8: a completed point-of-sale transaction. Unlike Purchase (which
// has a pending -> received two-step workflow), a Sale is created
// ATOMICALLY already "completed" - the moment it's created, stock is
// already decreased and the invoice already exists. This matches how a
// real checkout works: you don't "receive" a sale later, the transaction
// either happens now or it doesn't.
//
// The only way to undo a sale afterwards is to cancel it (see
// saleController.js's cancelSale), which restores stock via a `RETURN`
// StockMovement - there is no in-place edit of a completed sale's items.
//
// `sellingPrice` is snapshotted per line item at sale time (not looked up
// live from the Product later), so a sale's historical total never
// shifts even if the product's price changes afterwards.

const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
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
    sellingPrice: {
      type: Number,
      required: true,
      min: [0, 'Selling price cannot be negative'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    // Optional - a walk-in customer doesn't have to be registered first.
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    items: {
      type: [saleItemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'A sale must have at least one product line item',
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
    // sum(item.subtotal) - discount + tax. Recalculated server-side.
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'],
      default: 'Cash',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending'],
      default: 'paid',
    },
    status: {
      type: String,
      enum: ['completed', 'cancelled'],
      default: 'completed',
    },
    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ customer: 1, createdAt: -1 });

// PHASE 8: builds an invoice number like "INV-2026-000001" - same
// year+sequence pattern as Purchase.buildPurchaseNumberCandidate.
saleSchema.statics.buildInvoiceNumberCandidate = function (sequence) {
  const year = new Date().getFullYear();
  const paddedSequence = String(sequence).padStart(6, '0');
  return `INV-${year}-${paddedSequence}`;
};

module.exports = mongoose.model('Sale', saleSchema);
