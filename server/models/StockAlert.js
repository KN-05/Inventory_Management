// models/StockAlert.js
// Created automatically (in Phase 7) whenever a product's quantity drops
// to or below its lowStockThreshold. Admin/Staff can mark alerts resolved.

const mongoose = require('mongoose');

const stockAlertSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockAlert', stockAlertSchema);
