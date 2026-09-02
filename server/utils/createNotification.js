// utils/createNotification.js
// Small helper to create a Notification, mirroring utils/logActivity.js's
// pattern. "Fire and forget" with a caught error - a failed notification
// should never break the actual request that triggered it (e.g. a product
// save should still succeed even if the notification write fails).

const Notification = require('../models/Notification');

const createNotification = async (recipientRole, type, message, link = '') => {
  try {
    await Notification.create({ recipientRole, type, message, link });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};

module.exports = createNotification;
