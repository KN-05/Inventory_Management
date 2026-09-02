// routes/stockAlertRoutes.js

const express = require('express');
const router = express.Router();
const { getAlerts, resolveAlert } = require('../controllers/stockAlertController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getAlerts);
router.patch('/:id/resolve', resolveAlert);

module.exports = router;
