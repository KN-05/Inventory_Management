// routes/profileRoutes.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { body } = require('express-validator');
const router = express.Router();

const {
  getProfile,
  updateProfile,
  uploadPhoto,
  changePassword,
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateMiddleware');

// PHASE 2: profile photos use diskStorage (not memoryStorage like the CSV
// import) since they need to persist and be served back later via a URL,
// not just processed once and discarded.
const uploadsDir = path.join(__dirname, '..', 'uploads', 'profile-photos');
fs.mkdirSync(uploadsDir, { recursive: true }); // no-op if it already exists

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    // Random filename (not the original name) to avoid path-traversal
    // tricks and filename collisions between users.
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user._id}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
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

router.use(protect);

router.get('/', getProfile);

router.put(
  '/',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Must be a valid email'),
    body('phone').optional().trim(),
  ],
  validateRequest,
  updateProfile
);

router.post('/photo', upload.single('photo'), uploadPhoto);

router.put(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validateRequest,
  changePassword
);

module.exports = router;
