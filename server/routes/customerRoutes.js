// routes/customerRoutes.js

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  exportCustomers,
} = require('../controllers/customerController');

const { protect } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { PERMISSIONS } = require('../config/permissions');
const validateRequest = require('../middleware/validateMiddleware');

router.use(protect);

const customerValidationRules = [
  body('name').trim().notEmpty().withMessage('Customer name is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Must be a valid email'),
];

// PHASE 9: '/export' registered before '/:id' - order matters (see
// productRoutes.js's identical comment).
router.get('/export', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), exportCustomers);
router.get('/', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomers);
router.get('/:id', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomerById);
router.post(
  '/',
  requirePermission(PERMISSIONS.CUSTOMERS_CREATE),
  customerValidationRules,
  validateRequest,
  createCustomer
);
router.put(
  '/:id',
  requirePermission(PERMISSIONS.CUSTOMERS_UPDATE),
  customerValidationRules,
  validateRequest,
  updateCustomer
);
router.delete('/:id', requirePermission(PERMISSIONS.CUSTOMERS_DELETE), deleteCustomer);

module.exports = router;
