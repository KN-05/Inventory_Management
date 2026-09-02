// models/Supplier.js
// Represents a company/person that supplies products.
// "products" is a VIRTUAL field - it is not stored on the Supplier document
// itself. Instead, Mongoose looks up all Products whose `supplier` field
// matches this supplier's _id. This avoids duplicating data in two places.
//
// PHASE 6: expanded with the fuller "Supplier information" fields from the
// project spec (companyName, city, state, country, taxNumber, status) -
// all optional except `name`, so existing suppliers created before this
// phase remain perfectly valid documents.

const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
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
    state: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: '',
    },
    taxNumber: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate: supplier.products will contain all Product documents
// where product.supplier === this supplier's _id, WITHOUT storing an
// array of product ids on the supplier itself.
supplierSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'supplier',
});

module.exports = mongoose.model('Supplier', supplierSchema);
