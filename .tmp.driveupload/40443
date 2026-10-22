// routes/stockAlertRoutes.js
//
// PHASE 13 AUDIT NOTE: neither route below has a requirePermission check
// beyond being logged in - this is a deliberate choice, not an oversight.
// Viewing alerts and resolving one (e.g. "I've restocked this, dismiss
// it") are both low-risk, read-mostly operations with no financial or
// destructive impact, and Staff explicitly needs this per the spec's
// "stock-related information needed for daily operations." There is no
// dedicated ALERTS_* permission in config/permissions.js because gating
// this would add complexity without meaningfully reducing risk.

const express = require('express');
const router = express.Router();
const { getAlerts, resolveAlert } = require('../controllers/stockAlertController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getAlerts);
router.patch('/:id/resolve', resolveAlert);

module.exports = router;
