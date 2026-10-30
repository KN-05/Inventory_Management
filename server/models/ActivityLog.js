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
      enum: ['product', 'supplier', 'category', 'stock', 'user', 'auth', 'purchase', 'sale', 'customer', 'attendance', 'other'],
      default: 'other',
    },
  },
  { timestamps: true }
);

// PERFORMANCE: the activity list is always "newest first", optionally
// filtered by module or user (Activity Logs page + dashboard feed).
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ module: 1, createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });

// MULTI-BUSINESS: adds `business` and limits every query to the caller's business.
activityLogSchema.plugin(require('../plugins/tenantScope'));

module.exports = mongoose.model('ActivityLog', activityLogSchema);
