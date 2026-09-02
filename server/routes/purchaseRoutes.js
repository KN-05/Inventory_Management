// routes/purchaseRoutes.js

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  updatePaymentStatus,
  receivePurchase,
  deletePurchase,
} = require('../controllers/purchaseController');

const { protect } = require('../middleware/authMiddleware');
const { authorize, requirePermission } = require('../middleware/roleMiddleware');
const { PERMISSIONS } = require('../config/permissions');
const validateRequest = require('../middleware/validateMiddleware');

router.use(protect);

// PHASE 7: not exposed to Staff at all (no PURCHASES_* permission granted
// to the staff role in config/permissions.js), matching the spec's Staff
// "Allowed" list, which doesn't include Purchases.
const purchaseValidationRules = [
  body('supplier').notEmpty().withMessage('Supplier is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one product line item is required'),
  body('items.*.product').notEmpty().withMessage('Each line item needs a product'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Each line item quantity must be at least 1'),
  body('items.*.purchasePrice')
    .isFloat({ min: 0 })
    .withMessage('Each line item purchase price must be 0 or greater'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be 0 or greater'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('Tax must be 0 or greater'),
];

router.get('/', requirePermission(PERMISSIONS.PURCHASES_VIEW), getPurchases);
router.get('/:id', requirePermission(PERMISSIONS.PURCHASES_VIEW), getPurchaseById);
router.post(
  '/',
  requirePermission(PERMISSIONS.PURCHASES_CREATE),
  purchaseValidationRules,
  validateRequest,
  createPurchase
);
router.put(
  '/:id',
  requirePermission(PERMISSIONS.PURCHASES_UPDATE),
  [
    body('items').optional().isArray({ min: 1 }),
    body('discount').optional().isFloat({ min: 0 }),
    body('tax').optional().isFloat({ min: 0 }),
    body('paymentStatus').optional().isIn(['unpaid', 'partial', 'paid']),
  ],
  validateRequest,
  updatePurchase
);
router.patch(
  '/:id/payment-status',
  requirePermission(PERMISSIONS.PURCHASES_UPDATE),
  [body('paymentStatus').isIn(['unpaid', 'partial', 'paid']).withMessage('Invalid payment status')],
  validateRequest,
  updatePaymentStatus
);
router.post('/:id/receive', requirePermission(PERMISSIONS.PURCHASES_RECEIVE), receivePurchase);

// Admin-only delete, matching Product/Category's pattern
router.delete('/:id', authorize('admin'), deletePurchase);

module.exports = router;
