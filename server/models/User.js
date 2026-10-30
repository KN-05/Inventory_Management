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
      // A Google-only account has no password; every other account must have one.
      required: [
        function passwordRequired() {
          return !this.googleId;
        },
        'Password is required',
      ],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never return password field by default in queries
    },
    // Google account id (the verified `sub` claim of the Google ID token).
    // Unique, so one Google account can only ever be one user here.
    googleId: {
      type: String,
      default: undefined,
      select: false,
    },
    // New business sign-up progress. `status: 'pending'` means the person has
    // an account but has not finished creating their business yet: they can
    // only use the onboarding screens until they do. Old accounts have no
    // `onboarding` at all.
    onboarding: {
      status: { type: String, enum: ['pending', 'complete'], default: undefined },
      step: { type: String, enum: ['details', 'plan', 'review', 'done'], default: undefined },
      businessName: { type: String, trim: true, maxlength: 80, default: undefined },
      businessType: { type: String, trim: true, maxlength: 60, default: undefined },
      gstin: { type: String, trim: true, uppercase: true, maxlength: 15, default: undefined },
      phone: { type: String, trim: true, maxlength: 20, default: undefined },
      address: { type: String, trim: true, maxlength: 200, default: undefined },
      planId: { type: String, enum: ['starter', 'growth', 'pro'], default: undefined },
      billingCycle: { type: String, enum: ['monthly', 'yearly'], default: undefined },
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
    // PHASE 26: Manager-initiated Staff password reset. When a Manager
    // resets a Staff member's password, a 6-digit OTP is emailed to that
    // Staff member's OWN registered email (not the Manager's, not an
    // Admin's) - the same "store only a hash, never the raw code"
    // principle as passwordResetTokenHash above.
    staffResetOtpHash: {
      type: String,
      select: false,
      default: null,
    },
    staffResetOtpExpires: {
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

// One account per Google account (only users who have one take part).
userSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } });

// MULTI-BUSINESS: adds `business` and limits every query to the caller's business.
userSchema.plugin(require('../plugins/tenantScope'));

module.exports = mongoose.model('User', userSchema);
