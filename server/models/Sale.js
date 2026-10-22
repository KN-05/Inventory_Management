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
    // subtotal = quantity x sellingPrice. sellingPrice is the MRP INCLUDING
    // GST, so this is a GST-inclusive amount, before any bill discount.
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    // GST snapshot, calculated by utils/gst.js when the sale is created. The
    // rates are the ones actually APPLIED to this sale (SGST+CGST within the
    // state, or IGST to another state - never both) and are copied from the
    // product at that moment, so a past bill never changes if the product's
    // GST rate is edited later.
    //   taxableValue = amount payable for the line x 100 / (100 + GST rate)
    //   gstTotal     = GST INCLUDED in the amount payable (not added to it)
    //   lineTotal    = amount payable for the line (after its discount share)
    // Sales created before GST support have none of these (they read as 0);
    // sales from the first GST release (GST added on top) have gstApplied but
    // no gstMode - see below.
    discountShare: { type: Number, default: 0, min: 0 },
    taxableValue: { type: Number, default: 0, min: 0 },
    sgstRate: { type: Number, default: 0, min: 0 },
    cgstRate: { type: Number, default: 0, min: 0 },
    igstRate: { type: Number, default: 0, min: 0 },
    sgstAmount: { type: Number, default: 0, min: 0 },
    cgstAmount: { type: Number, default: 0, min: 0 },
    igstAmount: { type: Number, default: 0, min: 0 },
    gstTotal: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, default: 0, min: 0 },
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
    // GST totals for the whole bill. `tax` above is kept (= GST included) so
    // older code/reports that read `tax` keep working.
    gstApplied: { type: Boolean, default: false }, // false = legacy sale with a manual `tax` only
    // 'inclusive' = prices are GST-inclusive MRPs and the amount payable never
    // changes because of GST. Deliberately NO default: sales saved by the very
    // first GST release (which added GST on top of the price) have no gstMode,
    // and must keep being displayed as they were billed.
    gstMode: { type: String, enum: ['inclusive'] },
    // Place of supply: 'intra' = within the state (SGST + CGST), 'inter' = to
    // another state (IGST).
    supplyType: { type: String, enum: ['intra', 'inter'], default: 'intra' },
    taxableTotal: { type: Number, default: 0, min: 0 },
    totalSgst: { type: Number, default: 0, min: 0 },
    totalCgst: { type: Number, default: 0, min: 0 },
    totalIgst: { type: Number, default: 0, min: 0 },
    // Amount payable = sum(item.subtotal) - discount. GST is INSIDE this amount
    // (taxableTotal + GST included = totalAmount). Recalculated server-side.
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
