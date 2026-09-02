// controllers/settingsController.js

const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');
const Settings = require('../models/Settings');

// @desc   Get system settings
// @route  GET /api/admin/settings
// @access Private (Admin only)
const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getOrCreate();
  res.status(200).json({ success: true, settings });
});

// @desc   Update system settings
// @route  PUT /api/admin/settings
// @access Private (Admin only)
const updateSettings = asyncHandler(async (req, res) => {
  const { companyName, currency, defaultLowStockThreshold } = req.body;

  const settings = await Settings.getOrCreate();

  if (companyName !== undefined) settings.companyName = companyName;
  if (currency !== undefined) settings.currency = currency;
  if (defaultLowStockThreshold !== undefined) {
    settings.defaultLowStockThreshold = defaultLowStockThreshold;
  }

  await settings.save();

  await logActivity(req.user._id, 'Updated system settings', 'other');

  res.status(200).json({ success: true, message: 'Settings updated', settings });
});

module.exports = { getSettings, updateSettings };
