// models/Category.js
// Simple lookup collection used to group products.
//
// PHASE 6: added `image` (optional, uploaded the same way as a product
// photo) and `status` (active/inactive) per the project spec's Category
// model definition.

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // Relative URL path, e.g. "/uploads/category-photos/abc123.jpg".
    image: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Names are unique PER BUSINESS (two businesses may both have "Electronics").
categorySchema.index({ business: 1, name: 1 }, { unique: true });

// MULTI-BUSINESS: adds `business` and limits every query to the caller's business.
categorySchema.plugin(require('../plugins/tenantScope'));

module.exports = mongoose.model('Category', categorySchema);
