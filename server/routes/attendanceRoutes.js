// routes/attendanceRoutes.js
// PHASE 34: who can do what is decided here with authorize(); the
// controller adds the data rules (Sunday off, no future dates, Admin is
// never tracked). Admin is deliberately NOT allowed on the edit route -
// Admin can view everyone's attendance but only a Manager edits it.

const express = require('express');
const router = express.Router();

const {
  checkIn,
  getMyAttendance,
  getOverview,
  getUserAttendance,
  updateAttendance,
} = require('../controllers/attendanceController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

// Own attendance - Manager + Staff (Admin has none)
router.post('/check-in', authorize('manager', 'staff'), checkIn);
router.get('/me', authorize('manager', 'staff'), getMyAttendance);

// Everyone's attendance - Admin (view only) + Manager
router.get('/overview', authorize('admin', 'manager'), getOverview);
router.get('/user/:userId', authorize('admin', 'manager'), getUserAttendance);

// Edit - Manager only
router.put('/user/:userId/:date', authorize('manager'), updateAttendance);

module.exports = router;
