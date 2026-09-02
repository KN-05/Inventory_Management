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
  getStockReport,
  getSupplierReport,
} = require('../controllers/adminController');
const { getActivityLogs } = require('../controllers/activityLogController');
const { getSettings, updateSettings } = require('../controllers/settingsController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validateRequest = require('../middleware/validateMiddleware');

router.use(protect);

// --- User management: Admin only ---
router.get('/users', authorize('admin'), getUsers);

router.post(
  '/users',
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role').isIn(['manager', 'staff']).withMessage("Role must be 'manager' or 'staff'"),
  ],
  validateRequest,
  createUser
);

router.patch(
  '/users/:id/status',
  authorize('admin'),
  [body('isActive').isBoolean().withMessage('isActive must be true or false')],
  validateRequest,
  updateUserStatus
);

router.patch(
  '/users/:id/role',
  authorize('admin'),
  [
    body('role')
      .isIn(['admin', 'manager', 'staff'])
      .withMessage("Role must be 'admin', 'manager', or 'staff'"),
  ],
  validateRequest,
  updateUserRole
);

// --- Reports: Admin + Manager ---
router.get('/reports/stock', authorize('admin', 'manager'), getStockReport);
router.get('/reports/suppliers', authorize('admin', 'manager'), getSupplierReport);

// --- Activity Logs: Admin only (full log access, per the spec) ---
router.get('/activity-logs', authorize('admin'), getActivityLogs);

// --- Settings: Admin only ---
router.get('/settings', authorize('admin'), getSettings);
router.put(
  '/settings',
  authorize('admin'),
  [
    body('companyName').optional().trim().notEmpty(),
    body('currency').optional().trim().notEmpty(),
    body('defaultLowStockThreshold').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  updateSettings
);

module.exports = router;
