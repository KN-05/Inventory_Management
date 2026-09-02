// utils/logActivity.js
// Small helper to record an entry in the ActivityLog collection.
// Used across controllers (products, suppliers, categories, etc.) so the
// Dashboard's "Recent Activities" (Phase 6) has real data to show.
//
// Deliberately "fire and forget" with a caught error - if logging fails for
// some reason, it should NEVER break the actual request (e.g. a product
// should still get created even if the activity log write fails).

const ActivityLog = require('../models/ActivityLog');

const logActivity = async (userId, action, module = 'other') => {
  try {
    await ActivityLog.create({ user: userId, action, module });
  } catch (error) {
    console.error('Failed to write activity log:', error.message);
  }
};

module.exports = logActivity;
