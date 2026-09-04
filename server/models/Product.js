// models/Product.js

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },

    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },

    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    image: {
      type: String,
      default: '',
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },

    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },

    lowStockThreshold: {
      type: Number,
      required: true,
      min: [0, 'Threshold cannot be negative'],
      default: 10,
    },

    status: {
      type: String,
      enum: ['In Stock', 'Low Stock', 'Out of Stock'],
      default: 'In Stock',
    },
  },
  {
    timestamps: true,
  }
);


// ==========================================
// SKU GENERATOR
// ==========================================

productSchema.statics.buildSkuCandidate = function (
  categoryName,
  productName,
  sequence
) {
  const clean = (str, maxLen) =>
    (str || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .padEnd(maxLen, 'X')
      .slice(0, maxLen);

  const categoryPrefix = clean(categoryName, 4);
  const namePrefix = clean(productName, 3);
  const paddedSequence = String(sequence).padStart(4, '0');

  return `${categoryPrefix}-${namePrefix}-${paddedSequence}`;
};


// ==========================================
// BARCODE GENERATOR
// ==========================================

productSchema.statics.buildBarcodeCandidate = function () {
  const timestampPart = Date.now().toString().slice(-10);
  const randomPart = Math.floor(100 + Math.random() * 900);

  return `${timestampPart}${randomPart}`;
};


// ==========================================
// CALCULATE STATUS
// ==========================================

productSchema.methods.calculateStatus = function () {
  if (this.quantity <= 0) {
    return 'Out of Stock';
  }

  if (this.quantity <= this.lowStockThreshold) {
    return 'Low Stock';
  }

  return 'In Stock';
};


// ==========================================
// PRE SAVE HOOK
// Mongoose 9 compatible
// ==========================================

productSchema.pre('save', function () {
  this.status = this.calculateStatus();
});


// ==========================================
// POST SAVE HOOK
// STOCK ALERT + NOTIFICATION
// ==========================================

productSchema.post('save', async function (doc) {
  try {
    const StockAlert = require('./StockAlert');
    const createNotification = require('../utils/createNotification');

    // ------------------------------------------
    // LOW STOCK / OUT OF STOCK
    // ------------------------------------------

    if (
      doc.status === 'Low Stock' ||
      doc.status === 'Out of Stock'
    ) {
      const message = `"${doc.name}" is ${doc.status} (quantity: ${doc.quantity}, threshold: ${doc.lowStockThreshold})`;

      const existingActive = await StockAlert.findOne({
        product: doc._id,
        status: 'active',
      });

      // Existing alert
      if (existingActive) {
        existingActive.message = message;
        await existingActive.save();
      }

      // New alert
      else {
        await StockAlert.create({
          product: doc._id,
          message: message,
          status: 'active',
        });

        const notifType =
          doc.status === 'Out of Stock'
            ? 'out_of_stock'
            : 'low_stock';

        // Admin notification
        await createNotification(
          'admin',
          notifType,
          message,
          '/alerts'
        );

        // Manager notification
        await createNotification(
          'manager',
          notifType,
          message,
          '/alerts'
        );
      }
    }

    // ------------------------------------------
    // PRODUCT BACK IN STOCK
    // ------------------------------------------

    else {
      await StockAlert.updateMany(
        {
          product: doc._id,
          status: 'active',
        },
        {
          status: 'resolved',
        }
      );
    }
  }

  // Alert system should never break product save
  catch (error) {
    console.error(
      'Failed to sync stock alert:',
      error.message
    );
  }
});


// ==========================================
// EXPORT MODEL
// ==========================================

module.exports = mongoose.model('Product', productSchema);