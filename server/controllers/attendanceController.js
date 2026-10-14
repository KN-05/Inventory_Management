// controllers/attendanceController.js
// PHASE 34: Attendance.
//
//   Staff    - Check In once per day, view ONLY their own history.
//   Manager  - Check In for themselves too, view everyone's attendance,
//              and edit/mark any employee's day (present/absent + note).
//   Admin    - view everyone's attendance (read-only). Admin has no
//              attendance of their own and cannot Check In.
//   Sunday   - weekly day off: no check-in, never counted as absent.
//
// Role gating lives in routes/attendanceRoutes.js (authorize(...)); the
// handlers below add the data-level rules (Sunday, future dates, never
// tracking an Admin account).

const asyncHandler = require('../utils/asyncHandler');
const logActivity = require('../utils/logActivity');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { todayKey, isSunday, isValidDateKey, isValidMonthKey, currentMonthKey, daysInMonth } = require('../utils/attendanceDates');

// Turns a month + that person's stored records into one entry per
// calendar day, applying the Sunday / absent / pending / upcoming rules
// in ONE place so every screen agrees.
function buildDays(monthKey, records) {
  const today = todayKey();
  const byDate = new Map(records.map((r) => [r.date, r]));

  const days = daysInMonth(monthKey).map((date) => {
    const record = byDate.get(date);
    const sunday = isSunday(date);
    let status;

    if (sunday) status = 'off';
    else if (record) status = record.status; // 'present' | 'absent'
    else if (date > today) status = 'upcoming';
    else if (date === today) status = 'pending';
    else status = 'absent';

    return {
      date,
      weekday: new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      status,
      checkInTime: record?.checkInTime || null,
      source: record?.source || null,
      note: record?.note || '',
    };
  });

  return days;
}

function summarize(days) {
  return {
    present: days.filter((d) => d.status === 'present').length,
    absent: days.filter((d) => d.status === 'absent').length,
    sundaysOff: days.filter((d) => d.status === 'off').length,
  };
}

function resolveMonth(req, res) {
  const month = req.query.month || currentMonthKey();
  if (!isValidMonthKey(month)) {
    res.status(400);
    throw new Error('month must be in YYYY-MM format');
  }
  return month;
}

// @desc   Check in for today
// @route  POST /api/attendance/check-in
// @access Private (Manager + Staff - Admin has no attendance)
const checkIn = asyncHandler(async (req, res) => {
  const date = todayKey();

  if (isSunday(date)) {
    res.status(400);
    throw new Error('Sunday is a day off - no check-in needed');
  }

  const existing = await Attendance.findOne({ user: req.user._id, date });
  if (existing) {
    res.status(400);
    throw new Error(
      existing.status === 'present'
        ? 'You have already checked in today'
        : "Today's attendance was already recorded by a manager"
    );
  }

  let record;
  try {
    record = await Attendance.create({
      user: req.user._id,
      date,
      status: 'present',
      checkInTime: new Date(),
      source: 'self',
      markedBy: req.user._id,
    });
  } catch (error) {
    // Two rapid clicks: the unique (user, date) index rejects the second.
    if (error.code === 11000) {
      res.status(400);
      throw new Error('You have already checked in today');
    }
    throw error;
  }

  await logActivity(req.user._id, `Checked in for ${date}`, 'attendance');

  res.status(201).json({ success: true, message: 'Checked in', attendance: record });
});

// @desc   My own attendance for a month (+ today's state for the button)
// @route  GET /api/attendance/me?month=YYYY-MM
// @access Private (Manager + Staff)
const getMyAttendance = asyncHandler(async (req, res) => {
  const month = resolveMonth(req, res);
  const records = await Attendance.find({
    user: req.user._id,
    date: { $gte: `${month}-01`, $lte: `${month}-31` },
  });

  const days = buildDays(month, records);
  const today = todayKey();
  const todayRecord = await Attendance.findOne({ user: req.user._id, date: today });

  res.status(200).json({
    success: true,
    month,
    today,
    todayIsSunday: isSunday(today),
    checkedInToday: !!todayRecord && todayRecord.status === 'present',
    todayCheckInTime: todayRecord?.checkInTime || null,
    days,
    summary: summarize(days),
  });
});

// @desc   Everyone's attendance summary for a month
// @route  GET /api/attendance/overview?month=YYYY-MM
// @access Private (Admin + Manager)
const getOverview = asyncHandler(async (req, res) => {
  const month = resolveMonth(req, res);
  const today = todayKey();

  // Admin accounts are never tracked, so they're never listed.
  const employees = await User.find({ role: { $in: ['manager', 'staff'] } }).sort({ name: 1 });
  const records = await Attendance.find({
    user: { $in: employees.map((e) => e._id) },
    date: { $gte: `${month}-01`, $lte: `${month}-31` },
  });

  const recordsByUser = new Map();
  records.forEach((r) => {
    const key = String(r.user);
    if (!recordsByUser.has(key)) recordsByUser.set(key, []);
    recordsByUser.get(key).push(r);
  });

  const rows = employees.map((e) => {
    const days = buildDays(month, recordsByUser.get(String(e._id)) || []);
    const todayEntry = days.find((d) => d.date === today);
    return {
      _id: e._id,
      name: e.name,
      email: e.email,
      role: e.role,
      photo: e.photo,
      isActive: e.isActive,
      // null when `month` isn't the current month
      todayStatus: todayEntry ? todayEntry.status : null,
      ...summarize(days),
    };
  });

  res.status(200).json({ success: true, month, today, employees: rows });
});

// @desc   One employee's day-by-day attendance for a month
// @route  GET /api/attendance/user/:userId?month=YYYY-MM
// @access Private (Admin + Manager)
const getUserAttendance = asyncHandler(async (req, res) => {
  const month = resolveMonth(req, res);

  const employee = await User.findById(req.params.userId);
  if (!employee) {
    res.status(404);
    throw new Error('User not found');
  }
  if (employee.role === 'admin') {
    res.status(400);
    throw new Error('Admin accounts do not have attendance');
  }

  const records = await Attendance.find({
    user: employee._id,
    date: { $gte: `${month}-01`, $lte: `${month}-31` },
  });
  const days = buildDays(month, records);

  res.status(200).json({
    success: true,
    month,
    today: todayKey(),
    employee: { _id: employee._id, name: employee.name, email: employee.email, role: employee.role, photo: employee.photo },
    days,
    summary: summarize(days),
  });
});

// @desc   Manager creates/edits one employee's attendance for one day
// @route  PUT /api/attendance/user/:userId/:date
// @access Private (Manager only)
const updateAttendance = asyncHandler(async (req, res) => {
  const { userId, date } = req.params;
  const { status, note } = req.body;

  if (!isValidDateKey(date)) {
    res.status(400);
    throw new Error('date must be a valid YYYY-MM-DD date');
  }
  if (!['present', 'absent'].includes(status)) {
    res.status(400);
    throw new Error("status must be 'present' or 'absent'");
  }
  if (isSunday(date)) {
    res.status(400);
    throw new Error('Sunday is a day off - attendance cannot be edited');
  }
  if (date > todayKey()) {
    res.status(400);
    throw new Error('Attendance cannot be marked for a future date');
  }

  const employee = await User.findById(userId);
  if (!employee) {
    res.status(404);
    throw new Error('User not found');
  }
  if (employee.role === 'admin') {
    res.status(400);
    throw new Error('Admin accounts do not have attendance');
  }

  let record = await Attendance.findOne({ user: employee._id, date });
  if (record) {
    record.status = status;
    record.source = 'manager';
    record.markedBy = req.user._id;
    if (note !== undefined) record.note = note;
    if (status === 'absent') record.checkInTime = null;
    await record.save();
  } else {
    record = await Attendance.create({
      user: employee._id,
      date,
      status,
      checkInTime: null,
      source: 'manager',
      markedBy: req.user._id,
      note: note || '',
    });
  }

  await logActivity(req.user._id, `Marked ${employee.name} as ${status} for ${date}`, 'attendance');

  res.status(200).json({ success: true, message: 'Attendance updated', attendance: record });
});

module.exports = { checkIn, getMyAttendance, getOverview, getUserAttendance, updateAttendance };
