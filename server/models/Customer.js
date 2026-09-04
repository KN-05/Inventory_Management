// models/Customer.js
// PHASE 8: a person/business that products are sold to.
// `totalPurchases` and `lastPurchase` are DERIVED fields, kept up to date
// by saleController.js whenever a sale referencing this customer is
// created or cancelled - they are never set directly through the
// Customer create/update endpoints.

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    // Sum of totalAmount across every completed sale for this customer.
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPurchase: {
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

customerSchema.index({ name: 1 });

module.exports = mongoose.model('Customer', customerSchema);
