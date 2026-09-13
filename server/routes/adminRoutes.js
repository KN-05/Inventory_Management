// routes/adminRoutes.js
// User management routes here are Admin-only. Report routes are
// Admin + Manager, per the spec's "Accountant/Manager... reports,
// analytics" access - so authorize() is applied per-route/group instead
// of once for the whole router.

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getUsers,
  createUser,
  updateUserStatus,
  updateUserRole,
  adminResetPassword,
  requestStaffPasswordResetOtp,
  resetStaffPasswordWithOtp,
  getStaffList,
  getStockReport,
  getSupplierReport,
} = require('../controllers/adminController');
const { getActivityLogs } = require('../controllers/activityLogController');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const {
  getSalesAnalytics,
  getPurchaseAnalytics,
  getProfitAnalytics,
} = require('../controllers/analyticsController');

const { protect } = require('../middleware/authMiddleware');
const { authorize, requirePermission } = require('../middleware/roleMiddleware');
const { PERMISSIONS } = require('../config/permissions');
const { runValidation } = require('../middleware/validateMiddleware');

router.use(protect);

// --- User management: Admin only ---
router.get('/users', authorize('admin'), getUsers);

router.post(
  '/users',
  authorize('admin'),
  runValidation([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role').isIn(['manager', 'staff']).withMessage("Role must be 'manager' or 'staff'"),
  ]),
  createUser
);

router.patch(
  '/users/:id/status',
  authorize('admin'),
  runValidation([body('isActive').isBoolean().withMessage('isActive must be true or false')]),
  updateUserStatus
);

router.patch(
  '/users/:id/role',
  authorize('admin'),
  runValidation([
    body('role')
      .isIn(['admin', 'manager', 'staff'])
      .withMessage("Role must be 'admin', 'manager', or 'staff'"),
  ]),
  updateUserRole
);

// @route  POST /api/admin/users/:id/reset-password
// Admin directly resets any other user's password - no OTP, since the
// Admin performing this is already fully authenticated.
router.post(
  '/users/:id/reset-password',
  authorize('admin'),
  runValidation([
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ]),
  adminResetPassword
);

// --- PHASE 26: Manager -> Staff password reset (OTP emailed to the
// Staff member's own registered email address) ---
router.get('/staff-list', authorize('admin', 'manager'), getStaffList);
router.post(
  '/users/:id/staff-password-reset/request-otp',
  authorize('manager'),
  requestStaffPasswordResetOtp
);
router.post(
  '/users/:id/staff-password-reset/confirm',
  authorize('manager'),
  runValidation([
    body('otp').notEmpty().withMessage('Verification code is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ]),
  resetStaffPasswordWithOtp
);

// --- Reports: Admin + Manager ---
router.get('/reports/stock', authorize('admin', 'manager'), getStockReport);
router.get('/reports/suppliers', authorize('admin', 'manager'), getSupplierReport);

// --- Analytics: Admin + Manager, per ANALYTICS_VIEW (PHASE 10) ---
// Separate from the Reports above, matching the spec's sidebar having
// both "Reports" and "Analytics" as distinct items - Reports covers
// Inventory Analytics (stock value, category/supplier breakdown, already
// built in earlier phases); these three cover Sales, Purchase, and
// Profit analytics specifically.
router.get('/analytics/sales', requirePermission(PERMISSIONS.ANALYTICS_VIEW), getSalesAnalytics);
router.get('/analytics/purchases', requirePermission(PERMISSIONS.ANALYTICS_VIEW), getPurchaseAnalytics);
router.get('/analytics/profit', requirePermission(PERMISSIONS.ANALYTICS_VIEW), getProfitAnalytics);

// --- Activity Logs: Admin only (full log access, per the spec) ---
router.get('/activity-logs', authorize('admin'), getActivityLogs);

// --- Settings: Admin only ---
router.get('/settings', authorize('admin'), getSettings);
router.put(
  '/settings',
  authorize('admin'),
  runValidation([
    body('companyName').optional().trim().notEmpty(),
    body('currency').optional().trim().notEmpty(),
    body('defaultLowStockThreshold').optional().isInt({ min: 0 }),
  ]),
  updateSettings
);

module.exports = router;
