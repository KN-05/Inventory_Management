// routes/saleRoutes.js

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { getSales, getSaleById, createSale, cancelSale, exportSales } = require('../controllers/saleController');

const { protect } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { PERMISSIONS } = require('../config/permissions');
const validateRequest = require('../middleware/validateMiddleware');

router.use(protect);

const saleValidationRules = [
  body('items').isArray({ min: 1 }).withMessage('At least one product line item is required'),
  body('items.*.product').notEmpty().withMessage('Each line item needs a product'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Each line item quantity must be at least 1'),
  body('items.*.sellingPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Selling price must be 0 or greater'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be 0 or greater'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('Tax must be 0 or greater'),
  body('paymentMethod')
    .optional()
    .isIn(['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'])
    .withMessage('Invalid payment method'),
  body('paymentStatus').optional().isIn(['paid', 'pending']).withMessage('Invalid payment status'),
];

// PHASE 9: '/export' registered before '/:id' - order matters (see
// productRoutes.js's identical comment).
router.get('/export', requirePermission(PERMISSIONS.SALES_VIEW), exportSales);
router.get('/', requirePermission(PERMISSIONS.SALES_VIEW), getSales);
router.get('/:id', requirePermission(PERMISSIONS.SALES_VIEW), getSaleById);
router.post('/', requirePermission(PERMISSIONS.SALES_CREATE), saleValidationRules, validateRequest, createSale);
// PHASE 8: cancelling a sale reverses stock + a customer's totals.
// Admin + Manager both get PERMISSIONS.SALES_CANCEL (processing a
// return/cancellation is a normal Manager task per the spec's "strong
// operational and financial access"); Staff does NOT get it - a sale
// once completed stays completed for Staff, only Admin/Manager can
// reverse it.
router.post('/:id/cancel', requirePermission(PERMISSIONS.SALES_CANCEL), cancelSale);

module.exports = router;
