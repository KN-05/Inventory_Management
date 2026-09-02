// routes/categoryRoutes.js
// Full CRUD. View: everyone (Admin + Manager + Staff, per CATEGORIES_VIEW).
// Create/Edit: Admin + Manager only. Delete: Admin + Manager.
//
// PHASE 4 FIX: create/edit previously allowed ANY logged-in user (just
// `protect`), even though the Phase 2 permission map never gave Staff
// categories.create/categories.update - a real gap between the declared
// permissions and what was actually enforced. Now consistent.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { body } = require('express-validator');
const router = express.Router();

const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  uploadCategoryImage,
  deleteCategory,
} = require('../controllers/categoryController');

const { protect } = require('../middleware/authMiddleware');
const { authorize, requirePermission } = require('../middleware/roleMiddleware');
const { PERMISSIONS } = require('../config/permissions');
const validateRequest = require('../middleware/validateMiddleware');

// PHASE 6: category photo upload - same diskStorage pattern used for
// profile photos and product photos.
const categoryImagesDir = path.join(__dirname, '..', 'uploads', 'category-photos');
fs.mkdirSync(categoryImagesDir, { recursive: true });

const categoryImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, categoryImagesDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.params.id}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
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

router.use(protect);

const categoryValidationRules = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('status').optional().isIn(['active', 'inactive']).withMessage("Status must be 'active' or 'inactive'"),
];

router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post(
  '/',
  requirePermission(PERMISSIONS.CATEGORIES_CREATE),
  categoryValidationRules,
  validateRequest,
  createCategory
);
router.put(
  '/:id',
  requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
  categoryValidationRules,
  validateRequest,
  updateCategory
);
router.post(
  '/:id/image',
  requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
  categoryImageUpload.single('image'),
  uploadCategoryImage
);
router.delete('/:id', authorize('admin', 'manager'), deleteCategory);

module.exports = router;
