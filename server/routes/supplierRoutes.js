// routes/supplierRoutes.js
// Full CRUD. View: everyone. Create/Edit: Admin + Manager only
// (SUPPLIERS_CREATE/SUPPLIERS_UPDATE aren't in the Staff permission set -
// see config/permissions.js). Delete: Admin + Manager.

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  exportSuppliers,
} = require('../controllers/supplierController');

const { protect } = require('../middleware/authMiddleware');
const { authorize, requirePermission } = require('../middleware/roleMiddleware');
const { PERMISSIONS } = require('../config/permissions');
const validateRequest = require('../middleware/validateMiddleware');

router.use(protect);

const supplierValidationRules = [
  body('name').trim().notEmpty().withMessage('Supplier name is required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Must be a valid email'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage("Status must be 'active' or 'inactive'"),
];

// PHASE 9: '/export' registered before '/:id' - see productRoutes.js's
// identical comment for why the order matters.
router.get('/export', requirePermission(PERMISSIONS.SUPPLIERS_VIEW), exportSuppliers);
router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.post(
  '/',
  requirePermission(PERMISSIONS.SUPPLIERS_CREATE),
  supplierValidationRules,
  validateRequest,
  createSupplier
);
router.put(
  '/:id',
  requirePermission(PERMISSIONS.SUPPLIERS_UPDATE),
  supplierValidationRules,
  validateRequest,
  updateSupplier
);
router.delete('/:id', authorize('admin', 'manager'), deleteSupplier);

module.exports = router;
