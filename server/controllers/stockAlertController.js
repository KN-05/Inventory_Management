// controllers/stockAlertController.js
// Alerts themselves are created/resolved automatically by the Product
// model's post('save') hook (Phase 7, see models/Product.js). This
// controller only handles reading the alert list and manually resolving
// an alert (e.g. if someone wants to dismiss it before restocking).

const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');
const StockAlert = require('../models/StockAlert');

// @desc   Get all stock alerts (optional ?status=active|resolved)
// @route  GET /api/alerts
// @access Private (Admin + Staff)
const getAlerts = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const alerts = await StockAlert.find(filter)
    .populate('product', 'name sku quantity lowStockThreshold status')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: alerts.length, alerts });
});

// @desc   Mark an alert as resolved
// @route  PATCH /api/alerts/:id/resolve
// @access Private (Admin + Staff)
const resolveAlert = asyncHandler(async (req, res) => {
  const alert = await StockAlert.findById(req.params.id);

  if (!alert) {
    res.status(404);
    throw new Error('Alert not found');
  }

  alert.status = 'resolved';
  await alert.save();

  await logActivity(req.user._id, `Resolved a stock alert`, 'stock');

  res.status(200).json({ success: true, message: 'Alert marked as resolved', alert });
});

module.exports = { getAlerts, resolveAlert };
