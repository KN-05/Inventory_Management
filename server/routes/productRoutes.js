// routes/productRoutes.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { body } = require('express-validator');
const router = express.Router();

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProduct,
  increaseStock,
  decreaseStock,
  getProductStockMovements,
  importProducts,
  exportProducts,
} = require('../controllers/productController');

const { protect } = require('../middleware/authMiddleware');
const { authorize, requirePermission } = require('../middleware/roleMiddleware');
const { PERMISSIONS } = require('../config/permissions');
const validateRequest = require('../middleware/validateMiddleware');

// PHASE 13: multer handles the multipart/form-data file upload for CSV
// import. `memoryStorage` keeps the file in RAM as a Buffer (req.file.buffer)
// instead of writing it to disk - fine for small CSVs and means there's
// no leftover temp file to clean up afterwards.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB is plenty for a product CSV
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are allowed'));
    }
  },
});

// PHASE 6: product photo upload - same diskStorage pattern as
// profileRoutes.js's photo upload, since the image needs to persist and
// be served back later via a URL, not just processed once and discarded.
const productImagesDir = path.join(__dirname, '..', 'uploads', 'product-photos');
fs.mkdirSync(productImagesDir, { recursive: true }); // no-op if it already exists

const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, productImagesDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.params.id}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
    }
  },
});

// Every product route requires login
router.use(protect);

// PHASE 6: `sku` and `barcode` are no longer part of the request body at
// all - they're generated server-side (see productController.js) - so
// there's nothing to validate for them here anymore.
const productValidationRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('supplier').notEmpty().withMessage('Supplier is required'),
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a number 0 or greater'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a number 0 or greater'),
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a number 0 or greater'),
];

// Admin + Manager + Staff can view, create, edit, and adjust stock
// PHASE 9: '/export' MUST be registered before the '/:id' GET route
// below - otherwise Express would treat "export" as an :id value and
// try (and fail) to look up a product with that id.
router.get('/export', requirePermission(PERMISSIONS.PRODUCTS_VIEW), exportProducts);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', productValidationRules, validateRequest, createProduct);
// PHASE 4 FIX: CSV import previously had no permission check at all,
// meaning Staff could bulk-import products - directly against the spec's
// "Staff - Not allowed: Bulk CSV/Excel import." Now enforced with the
// requirePermission middleware (built in Phase 2, underused until now).
router.post(
  '/import',
  requirePermission(PERMISSIONS.IMPORTS_CREATE),
  upload.single('file'),
  importProducts
);
router.put('/:id', productValidationRules, validateRequest, updateProduct);
// PHASE 6: gated by the same PRODUCTS_UPDATE permission as editing a
// product's other fields - a photo is just another editable attribute.
router.post(
  '/:id/image',
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  productImageUpload.single('image'),
  uploadProductImage
);
router.patch(
  '/:id/increase-stock',
  [body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0')],
  validateRequest,
  increaseStock
);
router.patch(
  '/:id/decrease-stock',
  [body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0')],
  validateRequest,
  decreaseStock
);
// PHASE 7: available to every role that can view products at all (Admin,
// Manager, Staff) - it's read-only history, not a sensitive operation.
router.get('/:id/stock-movements', requirePermission(PERMISSIONS.PRODUCTS_VIEW), getProductStockMovements);

// Admin + Manager can delete
router.delete('/:id', authorize('admin', 'manager'), deleteProduct);

module.exports = router;
