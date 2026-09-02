// models/ActivityLog.js
// A simple audit trail: who did what, and in which part of the app.
// Used to power the "Recent Activities" section of the Dashboard (Phase 6).

const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: [true, 'Action description is required'],
      trim: true,
    },
    module: {
      type: String,
      enum: ['product', 'supplier', 'category', 'stock', 'user', 'auth', 'purchase', 'other'],
      default: 'other',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
