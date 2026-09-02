// models/Settings.js
// PHASE 3: system-wide settings, Admin-only to change (per the spec's
// "Settings" nav item under Admin). This is a SINGLETON collection - only
// one Settings document ever exists, found/created via getOrCreate()
// below, rather than the app having a concept of "which settings record."

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'My Company',
      trim: true,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    // Used as the default lowStockThreshold when creating a product
    // without specifying one - see productController.js's createProduct.
    defaultLowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
  },
  { timestamps: true }
);

// Ensures exactly one Settings document exists, creating it with defaults
// on first use. Every controller that needs settings should call this
// instead of Settings.findOne() directly.
settingsSchema.statics.getOrCreate = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
