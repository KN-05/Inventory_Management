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
const { googleAuth, signupWithEmail } = require('../controllers/accountController');
const { runValidation } = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { loginLimiter, passwordResetLimiter, signupLimiter } = require('../middleware/rateLimiters');

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
  loginLimiter, // 10 failed attempts / 15 min / IP
  runValidation([
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  loginUser
);

// POST /api/auth/logout - requires a valid token
// Google sign-in / sign-up (the Google token is verified on the server)
router.post(
  '/google',
  loginLimiter,
  runValidation([
    body('credential').isString().notEmpty().withMessage('Google credential is required'),
    body('intent').optional().isIn(['signin', 'signup']).withMessage('Invalid intent'),
  ]),
  googleAuth
);

// New business account with e-mail + password (alternative to Google)
router.post(
  '/signup',
  signupLimiter,
  runValidation([
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2 to 60 characters'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ]),
  signupWithEmail
);

router.post('/logout', protect, logoutUser);

// GET /api/auth/me - requires a valid token
router.get('/me', protect, getMe);

// POST /api/auth/forgot-password - PHASE 2
router.post(
  '/forgot-password',
  passwordResetLimiter,
  runValidation([body('email').isEmail().withMessage('A valid email is required')]),
  forgotPassword
);

// POST /api/auth/reset-password/:token - PHASE 2
router.post(
  '/reset-password/:token',
  passwordResetLimiter,
  runValidation([
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ]),
  resetPassword
);

module.exports = router;
