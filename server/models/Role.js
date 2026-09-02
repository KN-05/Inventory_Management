// models/Role.js
// A lightweight collection describing the two roles in the system.
// User.role stores the actual value ('admin' | 'staff') directly for
// simplicity and fast permission checks - this collection exists so the
// Admin Panel can list/describe roles and optionally attach extra
// permission metadata later, without changing the User schema.

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ['admin', 'staff'],
      required: true,
      unique: true,
    },
    // Human-friendly label shown in the UI (e.g. "Staff/Manager")
    displayName: {
      type: String,
      required: true,
    },
    // Optional: fine-grained permission strings, e.g. ['products:delete']
    permissions: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
