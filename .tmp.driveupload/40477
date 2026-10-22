// utils/attendanceDates.js
// PHASE 34: date helpers for Attendance. Everything is a "YYYY-MM-DD"
// string computed in ONE business timezone, so "today" and "is it
// Sunday" mean the same thing no matter where the server is hosted
// (a UTC server would otherwise flip to the next day at 5:30am IST).
// Override with ATTENDANCE_TIMEZONE in .env if the business isn't in India.

const TIMEZONE = process.env.ATTENDANCE_TIMEZONE || 'Asia/Kolkata';

// en-CA formats dates as YYYY-MM-DD.
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function todayKey() {
  return dayFormatter.format(new Date());
}

// Sunday is the weekly day off. Parsed as UTC noon purely to read the
// weekday of the calendar date itself - the timezone doesn't matter here.
function isSunday(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay() === 0;
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isValidMonthKey(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '');
}

function currentMonthKey() {
  return todayKey().slice(0, 7);
}

// Every "YYYY-MM-DD" in a "YYYY-MM" month.
function daysInMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`);
}

module.exports = { TIMEZONE, todayKey, isSunday, isValidDateKey, isValidMonthKey, currentMonthKey, daysInMonth };
