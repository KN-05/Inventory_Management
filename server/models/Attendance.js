// models/Attendance.js
// PHASE 34: one document per (employee, day) - only created when someone
// actually checks in, or when a Manager manually marks/edits a day.
// Days with NO document are derived by the controller instead of being
// stored: Sunday -> "off", a past working day -> "absent", today -> "pending".
// That keeps the collection small (no nightly job to pre-create "absent"
// rows for every employee) and means a Sunday can never be wrongly absent.
//
// `date` is a plain "YYYY-MM-DD" string (in the business timezone - see
// utils/attendanceDates.js), not a Date, so there's no midnight/UTC
// off-by-one-day ambiguity and the unique index below is trivial.
//
// Admin accounts never get Attendance documents - Admin is not tracked.

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'],
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'present',
    },
    // Set when the employee uses the "Check In" button; stays null for
    // days a Manager marked by hand.
    checkInTime: {
      type: Date,
      default: null,
    },
    // 'self' = the employee clicked Check In, 'manager' = a Manager
    // created/edited this record.
    source: {
      type: String,
      enum: ['self', 'manager'],
      default: 'self',
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [200, 'Note cannot exceed 200 characters'],
      default: '',
    },
  },
  { timestamps: true }
);

// One record per person per day - also what makes a double "Check In"
// click harmless (the second insert simply fails the unique index).
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
