// controllers/activityLogController.js
// PHASE 3: "Admin should have full activity log access" - unlike the
// Dashboard's "Recent Activity" (last 10 entries only, Phase 6), this
// gives the Admin a full, paginated, filterable view of every logged
// action across the app.

const asyncHandler = require('../utils/asyncHandler');
const ActivityLog = require('../models/ActivityLog');

// @desc   Get activity logs, paginated and optionally filtered
// @route  GET /api/admin/activity-logs?module=&user=&page=&limit=
// @access Private (Admin only)
const getActivityLogs = asyncHandler(async (req, res) => {
  const { module, user, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (module) filter.module = module;
  if (user) filter.user = user;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    ActivityLog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: logs.length,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    logs,
  });
});

module.exports = { getActivityLogs };
