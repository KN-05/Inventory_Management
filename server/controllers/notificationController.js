// controllers/notificationController.js
// PHASE 3: powers the navbar bell icon. Every logged-in user (any role)
// can see notifications scoped to their role (see models/Notification.js
// for the "role-scoped, not per-user" simplification note).

const asyncHandler = require('../utils/asyncHandler');
const Notification = require('../models/Notification');

// @desc   Get notifications for the current user's role (+ 'all')
// @route  GET /api/notifications?unreadOnly=true
// @access Private
const getNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query;

  const filter = { recipientRole: { $in: [req.user.role, 'all'] } };
  if (unreadOnly === 'true') filter.isRead = false;

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(30);

  res.status(200).json({ success: true, count: notifications.length, notifications });
});

// @desc   Get unread notification count for the current user's role
// @route  GET /api/notifications/unread-count
// @access Private
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipientRole: { $in: [req.user.role, 'all'] },
    isRead: false,
  });

  res.status(200).json({ success: true, count });
});

// @desc   Mark one notification as read
// @route  PATCH /api/notifications/:id/read
// @access Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({ success: true, message: 'Notification marked as read' });
});

// @desc   Mark all of the current user's role-scoped notifications as read
// @route  PATCH /api/notifications/read-all
// @access Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipientRole: { $in: [req.user.role, 'all'] }, isRead: false },
    { isRead: true }
  );

  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
