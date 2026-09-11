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
const { runValidation } = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');

// POST /api/auth/register
// PHASE 2: no `role` validator here anymore, and this route now only
// succeeds ONCE (bootstrap Admin) - see authController.js's registerUser.
//
// BUGFIX: this used to import validateMiddleware's default export as
// `validateRequest` and pass an array of validator chains as a separate
// middleware argument - both wrong after the runValidation refactor (see
// validateMiddleware.js's comment for the full "next is not a function"
// story). Every route below now uses runValidation(rules) consistently.
router.post(
  '/register',
  runValidation([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ]),
  registerUser
);

// POST /api/auth/login
router.post(
  '/login',
  runValidation([
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  loginUser
);

// POST /api/auth/logout - requires a valid token
router.post('/logout', protect, logoutUser);

// GET /api/auth/me - requires a valid token
router.get('/me', protect, getMe);

// POST /api/auth/forgot-password - PHASE 2
router.post(
  '/forgot-password',
  runValidation([body('email').isEmail().withMessage('A valid email is required')]),
  forgotPassword
);

// POST /api/auth/reset-password/:token - PHASE 2
router.post(
  '/reset-password/:token',
  runValidation([
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ]),
  resetPassword
);

module.exports = router;
