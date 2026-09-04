// models/Notification.js
// PHASE 3: powers the navbar's notification bell + unread count.
//
// Simplification note (documented for learners): notifications are
// scoped to a ROLE ("admin", "manager", "staff", or "all"), not to an
// individual user, and `isRead` is a single shared flag for that
// notification - not per-user. This keeps the model simple for a
// learning project. A production system with many Admins would instead
// track per-user read state (e.g. a `readBy: [userId]` array, or a
// separate join collection) so one Admin marking something read doesn't
// hide it from another Admin.

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      enum: ['admin', 'manager', 'staff', 'all'],
      required: true,
    },
    type: {
      type: String,
      enum: ['low_stock', 'out_of_stock', 'user_created', 'new_purchase', 'new_sale', 'system'],
      default: 'system',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional path the frontend can navigate to when the notification is clicked
    link: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
