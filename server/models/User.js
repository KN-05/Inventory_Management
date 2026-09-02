// models/User.js
// Represents a person who can log into the system.
// Password is never stored in plain text - bcrypt hashes it automatically
// before saving, via the pre('save') hook below.
//
// PHASE 2 UPDATE: three roles now instead of two ('admin', 'manager',
// 'staff' - 'manager' represents the Accountant/Manager role from the
// project spec). Added photo, phone, createdBy, lastLogin (all requested
// by the spec), plus password-reset token fields for the Forgot Password
// flow.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never return password field by default in queries
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    // Path to the uploaded photo file, served from /uploads/... - see
    // server.js's static file serving and routes/profileRoutes.js's
    // upload endpoint. Empty string means "no photo uploaded yet".
    photo: {
      type: String,
      default: '',
    },
    // Internal DB value is always 'admin', 'manager', or 'staff'.
    // The frontend maps these to display labels ("Accountant/Manager",
    // "Staff") via src/utils/roleLabel.js.
    role: {
      type: String,
      enum: ['admin', 'manager', 'staff'],
      default: 'staff',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Who created this account. Null for the bootstrap Admin (the very
    // first account, which self-registers); set to an Admin's _id for
    // every account created afterwards via the Admin Panel, since
    // registration is Admin-only after the bootstrap admin exists.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    // Forgot Password flow: a hashed, time-limited token. We store a HASH
    // of the token (never the raw token) so that even if the database were
    // exposed, the reset tokens themselves couldn't be used - the same
    // principle as never storing plain-text passwords.
    passwordResetTokenHash: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
      default: null,
    },
  },
  { timestamps: true }
);

// Runs automatically before every .save() call.
// Only re-hash the password if it was actually changed (avoids re-hashing
// an already-hashed password when, e.g., only the name is updated).
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method used during login to compare the entered password
// with the hashed password stored in the database.
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
