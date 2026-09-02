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
      unique: true,
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

module.exports = mongoose.model('Category', categorySchema);
