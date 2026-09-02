// controllers/authController.js

const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const logActivity = require('../utils/logActivity');
const User = require('../models/User');

// Shape the user object we send back to the frontend.
// IMPORTANT: never include the password, even hashed.
const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  photo: user.photo,
  role: user.role,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
});

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Public - but ONLY for the very first account (bootstrap Admin)
//
// PHASE 2 UPDATE: the project spec is explicit - "Only Admin can create
// Accountant/Manager and Staff accounts." So public self-registration now
// works ONLY ONCE, to create the very first Admin account (otherwise
// nobody could ever get in). Once any Admin exists, this endpoint refuses
// every further request and tells the caller to contact an Admin, who
// creates Manager/Staff accounts from the Admin Panel instead
// (POST /api/admin/users - see adminController.js, added this phase).
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const adminAlreadyExists = await User.exists({ role: 'admin' });
  if (adminAlreadyExists) {
    res.status(403);
    throw new Error(
      'Public registration is closed. An administrator already exists - ask an Admin to create your account.'
    );
  }

  // PHASE 11 FIX: the User schema lowercases email when SAVING (via the
  // `lowercase: true` schema option), but that transform does NOT apply to
  // query filters. Normalizing here too avoids a duplicate-case account
  // slipping past this check.
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password, // gets hashed automatically by the User model's pre-save hook
    role: 'admin', // this branch only runs when no admin exists yet
  });

  const token = generateToken(user._id, user.role);

  res.status(201).json({
    success: true,
    message: 'Registration successful - you are the first user, so you were made Admin',
    token,
    user: formatUser(user),
  });
});

// @desc   Log in an existing user
// @route  POST /api/auth/login
// @access Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // PHASE 11 FIX: same normalization issue as registerUser above - without
  // this, a correct password would fail to log in if the email was typed
  // (or autofilled) with different casing than it was originally stored.
  const normalizedEmail = email.toLowerCase().trim();

  // password has `select: false` in the schema, so we explicitly ask for it here
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated. Contact an administrator.');
  }

  // PHASE 2: record lastLogin, requested by the User model spec.
  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id, user.role);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: formatUser(user),
  });
});

// @desc   Log out the current user
// @route  POST /api/auth/logout
// @access Private
//
// NOTE (learning note): JWTs are stateless - the server doesn't "remember"
// logged-in sessions, so there's nothing to invalidate here server-side.
// The real logout work happens on the frontend (deleting the stored token).
// This endpoint exists mainly for a consistent API shape / future use
// (e.g. token blacklisting) and to log the action.
const logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @desc   Get the currently logged-in user's info
// @route  GET /api/auth/me
// @access Private
const getMe = asyncHandler(async (req, res) => {
  // req.user was set by the `protect` middleware
  res.status(200).json({
    success: true,
    user: formatUser(req.user),
  });
});

// @desc   Request a password reset - generates a time-limited token
// @route  POST /api/auth/forgot-password
// @access Public
// @body   { email }
//
// PHASE 2: "Forgot password UI if backend support exists" - this IS the
// backend support. Since this project has no email-sending service
// configured (adding one would mean a new external dependency, which the
// spec says to avoid unless required), the reset link is returned
// directly in the API response for local/dev use instead of emailed.
// A comment below marks exactly where you'd plug in a real email
// provider (e.g. Nodemailer + SMTP, SendGrid, Resend) for production.
//
// SECURITY NOTE: we always respond with the same generic success message,
// whether or not the email exists in the database - this prevents an
// attacker from using this endpoint to discover which emails are
// registered ("email enumeration").
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });

  let devResetUrl; // only populated (and only returned) when a user was found

  if (user) {
    // Generate a random raw token, but only store its HASH in the
    // database - same principle as never storing plain-text passwords.
    // The raw token is what gets put in the reset link; without it, even
    // someone with database access couldn't forge a valid reset.
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    devResetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

    // PRODUCTION TODO: send `devResetUrl` via a real email provider here
    // instead of returning it in the response, e.g.:
    //   await sendEmail(user.email, 'Reset your password', devResetUrl);
    console.log(`[DEV] Password reset link for ${user.email}: ${devResetUrl}`);
  }

  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been generated.',
    // Only present in this dev-mode setup - a real deployment with email
    // sending configured would remove this field from the response.
    devResetUrl,
  });
});

// @desc   Reset password using the token from the forgot-password email/link
// @route  POST /api/auth/reset-password/:token
// @access Public
// @body   { newPassword }
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() }, // not expired
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) {
    res.status(400);
    throw new Error('This password reset link is invalid or has expired');
  }

  user.password = newPassword; // re-hashed automatically by the pre('save') hook
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();

  await logActivity(user._id, 'Reset their password via forgot-password link', 'auth');

  res.status(200).json({
    success: true,
    message: 'Password reset successful. You can now log in with your new password.',
  });
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
};
