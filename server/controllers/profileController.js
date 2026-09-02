// controllers/profileController.js
// Lets any logged-in user (Admin, Manager, or Staff) manage their OWN
// account. Unlike adminController.js, there's no :id param here -
// everything operates on req.user (set by the `protect` middleware), so a
// user can only ever view/change their own profile, never someone else's.

const fs = require('fs');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');
const User = require('../models/User');

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

// @desc   Get the current user's profile
// @route  GET /api/profile
// @access Private
const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: formatUser(req.user) });
});

// @desc   Update the current user's name/email/phone
// @route  PUT /api/profile
// @access Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;
  const user = await User.findById(req.user._id);

  if (email) {
    // PHASE 11 FIX: same normalization issue as auth - compare/query using
    // the lowercased form so a change in casing alone doesn't trigger an
    // unnecessary/incorrect "already exists" check.
    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail !== user.email) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        res.status(400);
        throw new Error('An account with this email already exists');
      }
      user.email = normalizedEmail;
    }
  }

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;

  const updated = await user.save();

  await logActivity(req.user._id, 'Updated their profile', 'user');

  res.status(200).json({ success: true, message: 'Profile updated', user: formatUser(updated) });
});

// @desc   Upload/replace the current user's profile photo
// @route  POST /api/profile/photo
// @access Private
//
// PHASE 2: the file itself is handled by multer (see routes/profileRoutes.js
// - diskStorage this time, since photos should persist across requests,
// unlike the CSV import's in-memory buffer which is only needed briefly).
// We store just the relative URL path in the database, and delete the
// old photo file (if any) so uploads don't pile up on disk.
const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No photo file was uploaded');
  }

  const user = await User.findById(req.user._id);

  // Clean up the previous photo file, if one exists, before saving the new path.
  if (user.photo) {
    const oldPath = path.join(__dirname, '..', user.photo);
    fs.unlink(oldPath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Failed to delete old profile photo:', err.message);
      }
    });
  }

  // Stored as a relative URL path (e.g. "/uploads/profile-photos/abc.jpg")
  // so the frontend can use it directly as an <img src>, and server.js's
  // static file serving (express.static) can serve it.
  user.photo = `/uploads/profile-photos/${req.file.filename}`;
  await user.save();

  await logActivity(req.user._id, 'Updated their profile photo', 'user');

  res.status(200).json({ success: true, message: 'Photo updated', photo: user.photo });
});

// @desc   Change the current user's password
// @route  PUT /api/profile/change-password
// @access Private
// @body   { currentPassword, newPassword }
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // password has `select: false` in the schema, so fetch it explicitly here
  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword; // re-hashed automatically by the pre('save') hook
  await user.save();

  await logActivity(req.user._id, 'Changed their password', 'user');

  res.status(200).json({ success: true, message: 'Password changed successfully' });
});

module.exports = { getProfile, updateProfile, uploadPhoto, changePassword };
