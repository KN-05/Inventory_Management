// routes/authRoutes.js

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const validateRequest = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');

// POST /api/auth/register
// PHASE 2: no `role` validator here anymore, and this route now only
// succeeds ONCE (bootstrap Admin) - see authController.js's registerUser.
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  validateRequest,
  registerUser
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  loginUser
);

// POST /api/auth/logout - requires a valid token
router.post('/logout', protect, logoutUser);

// GET /api/auth/me - requires a valid token
router.get('/me', protect, getMe);

// POST /api/auth/forgot-password - PHASE 2
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('A valid email is required')],
  validateRequest,
  forgotPassword
);

// POST /api/auth/reset-password/:token - PHASE 2
router.post(
  '/reset-password/:token',
  [
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validateRequest,
  resetPassword
);

module.exports = router;
