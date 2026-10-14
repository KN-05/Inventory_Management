// src/pages/Attendance.jsx
// PHASE 34: Attendance - one page, three different experiences:
//
//   Staff    - "Check In" button (once a day) + their OWN month history.
//   Manager  - their own Check In/history, plus a Team view of everyone's
//              attendance where they can edit any day (present/absent + note).
//   Admin    - Team view only, read-only. Admin has no attendance of their own.
//
// Sunday is the weekly day off: no check-in, never counted as absent.
// All the rules (Sunday/absent/pending/upcoming) are computed by the backend
// so every role sees identical numbers - this file only renders them.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import {
  checkIn,
  getMyAttendance,
  getAttendanceOverview,
  getUserAttendance,
  updateUserAttendance,
} from '../api/attendanceApi';
import { roleLabel } from '../utils/roleLabel';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import AnimatedModal from '../components/common/AnimatedModal';
import StatCard from '../components/dashboard/StatCard';
import { API_ORIGIN } from '../api/axiosInstance';
import { ArrowLeft, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, CircleCheck, CircleX, Users } from 'lucide-react';
import { ICON_SM } from '../utils/iconProps';

const STATUS_BADGE = {
  present: { className: 'badge badge-green', label: 'Present' },
  absent: { className: 'badge badge-red', label: 'Absent' },
  off: { className: 'badge', label: 'Sunday Off' },
  pending: { className: 'badge badge-yellow', label: 'Not checked in yet' },
  upcoming: { className: 'badge', label: 'Upcoming' },
};

const ROLE_BADGE = { manager: 'badge badge-blue', staff: 'badge badge-yellow' };

function StatusBadge({ status }) {
  const badge = STATUS_BADGE[status] || { className: 'badge', label: status };
  return <span className={badge.className}>{badge.label}</span>;
}

function formatDate(dateKey) {
  // Parsed at UTC noon and formatted in UTC so the calendar date never shifts.
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function monthLabel(monthKey) {
  return new Date(`${monthKey}-01T12:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------
// Month navigation (prev / picker / next)
// ---------------------------------------------------------------
function MonthNav({ month, today, onChange }) {
  const isCurrentMonth = month >= today.slice(0, 7);
  return (
    <div className="attendance-month-nav">
      <Button variant="secondary" type="button" onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeft {...ICON_SM} /> Prev
      </Button>
      <input
        type="month"
        value={month}
        max={today.slice(0, 7)}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        aria-label="Choose month"
      />
      <Button
        variant="secondary"
        type="button"
        disabled={isCurrentMonth}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        Next <ChevronRight {...ICON_SM} />
      </Button>
      <strong>{monthLabel(month)}</strong>
    </div>
  );
}

// ---------------------------------------------------------------
// Day-by-day table. `onEdit` is only passed for a Manager.
// ---------------------------------------------------------------
function DaysTable({ days, onEdit }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th>Status</th>
          <th>Check-in</th>
          <th>Note</th>
          {onEdit && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {days.map((d) => {
          const muted = d.status === 'off' || d.status === 'upcoming';
          const editable = onEdit && d.status !== 'off' && d.status !== 'upcoming';
          return (
            <tr key={d.date} className={muted ? 'attendance-row-muted' : undefined}>
              <td>{formatDate(d.date)}</td>
              <td>{d.weekday}</td>
              <td>
                <StatusBadge status={d.status} />
              </td>
              <td>
                {d.checkInTime
                  ? formatTime(d.checkInTime)
                  : d.source === 'manager'
                    ? 'Marked by manager'
                    : '—'}
              </td>
              <td>{d.note || '—'}</td>
              {onEdit && (
                <td>
                  {editable ? (
                    <button className="btn-link" onClick={() => onEdit(d)}>
                      Edit
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SummaryCards({ summary }) {
  return (
    <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
      <StatCard icon={<CircleCheck {...ICON_SM} />} label="Present" value={summary.present} tone="success" index={0} />
      <StatCard icon={<CircleX {...ICON_SM} />} label="Absent" value={summary.absent} tone="danger" index={1} />
      <StatCard icon={<CalendarDays {...ICON_SM} />} label="Sundays Off" value={summary.sundaysOff} tone="default" index={2} />
    </div>
  );
}

// ---------------------------------------------------------------
// My attendance (Staff + Manager)
// ---------------------------------------------------------------
function MyAttendance() {
  const toast = useToast();
  const [month, setMonth] = useState(null); // null = current month (server decides)
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await getMyAttendance(month || undefined));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance');
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await checkIn();
      toast.success('Checked in - have a great day!');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
      await load();
    } finally {
      setCheckingIn(false);
    }
  };

  if (error) return <p className="banner banner-error">{error}</p>;
  if (!data) return <Loader label="Loading your attendance..." />;

  return (
    <>
      <Card style={{ marginBottom: '1.25rem' }}>
        <div className="attendance-checkin">
          <div>
            <p className="attendance-checkin-date">{formatDate(data.today)}</p>
            {data.todayIsSunday ? (
              <p className="attendance-checkin-sub">Today is Sunday - it's your day off.</p>
            ) : data.checkedInToday ? (
              <p className="attendance-checkin-sub">
                You checked in today at {formatTime(data.todayCheckInTime)}
              </p>
            ) : (
              <p className="attendance-checkin-sub">You haven't checked in yet today.</p>
            )}
          </div>
          <Button
            variant="primary"
            type="button"
            onClick={handleCheckIn}
            disabled={checkingIn || data.todayIsSunday || data.checkedInToday}
          >
            {data.checkedInToday ? 'Checked in' : checkingIn ? 'Checking in...' : 'Check in'}
          </Button>
        </div>
      </Card>

      <SummaryCards summary={data.summary} />

      <Card title="My Attendance History">
        <MonthNav month={data.month} today={data.today} onChange={setMonth} />
        <div style={{ marginTop: '1rem' }}>
          <DaysTable days={data.days} />
        </div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------
// Manager's edit dialog for one employee's one day
// ---------------------------------------------------------------
function EditDayModal({ day, employeeName, onClose, onSave }) {
  const [status, setStatus] = useState('present');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (day) {
      setStatus(day.status === 'absent' ? 'absent' : 'present');
      setNote(day.note || '');
    }
  }, [day]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(day.date, { status, note });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedModal open={!!day} onClose={onClose} maxWidth={400}>
      <h2>Edit attendance</h2>
      {day && (
        <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
          {employeeName} - {formatDate(day.date)} ({day.weekday})
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <label htmlFor="attendance-status">Status</label>
        <select id="attendance-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
        </select>

        <label htmlFor="attendance-note" style={{ marginTop: '0.75rem' }}>
          Note (optional)
        </label>
        <input
          id="attendance-note"
          type="text"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Forgot to check in / on approved leave"
        />

        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

// ---------------------------------------------------------------
// Team attendance (Admin = read-only, Manager = can edit)
// ---------------------------------------------------------------
function TeamAttendance({ canEdit }) {
  const toast = useToast();
  const [month, setMonth] = useState(null);
  const [overview, setOverview] = useState(null);
  const [selected, setSelected] = useState(null); // employee row being viewed
  const [detail, setDetail] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setError('');
    try {
      setOverview(await getAttendanceOverview(month || undefined));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load team attendance');
    }
  }, [month]);

  const loadDetail = useCallback(async () => {
    if (!selected) return;
    try {
      setDetail(await getUserAttendance(selected._id, month || undefined));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance');
    }
  }, [selected, month]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    setDetail(null);
    loadDetail();
  }, [loadDetail]);

  const handleSave = async (date, body) => {
    try {
      await updateUserAttendance(selected._id, date, body);
      toast.success('Attendance updated');
      setEditingDay(null);
      await Promise.all([loadDetail(), loadOverview()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update attendance');
    }
  };

  if (error) return <p className="banner banner-error">{error}</p>;
  if (!overview) return <Loader label="Loading team attendance..." />;

  // ---- One employee's day-by-day view ----
  if (selected) {
    return (
      <>
        <div style={{ marginBottom: '1rem' }}>
          <Button variant="secondary" type="button" onClick={() => { setSelected(null); setDetail(null); }}>
            <ArrowLeft {...ICON_SM} /> Back to team
          </Button>
        </div>

        {!detail ? (
          <Loader label="Loading attendance..." />
        ) : (
          <>
            <Card style={{ marginBottom: '1.25rem' }}>
              <div className="attendance-checkin">
                <div>
                  <p className="attendance-checkin-date">{detail.employee.name}</p>
                  <p className="attendance-checkin-sub">
                    {roleLabel(detail.employee.role)} - {detail.employee.email}
                  </p>
                </div>
                {!canEdit && <span className="badge">View only</span>}
              </div>
            </Card>

            <SummaryCards summary={detail.summary} />

            <Card title="Attendance History">
              <MonthNav month={detail.month} today={detail.today} onChange={setMonth} />
              <div style={{ marginTop: '1rem' }}>
                <DaysTable days={detail.days} onEdit={canEdit ? setEditingDay : undefined} />
              </div>
            </Card>

            <EditDayModal
              day={editingDay}
              employeeName={detail.employee.name}
              onClose={() => setEditingDay(null)}
              onSave={handleSave}
            />
          </>
        )}
      </>
    );
  }

  // ---- Everyone, one row each ----
  const showToday = overview.employees.some((e) => e.todayStatus);
  return (
    <Card title="Team Attendance">
      <MonthNav month={overview.month} today={overview.today} onChange={setMonth} />
      {overview.employees.length === 0 ? (
        <p className="empty-state" style={{ marginTop: '1rem' }}>
          No staff or manager accounts to track yet.
        </p>
      ) : (
        <table className="data-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Role</th>
              {showToday && <th>Today</th>}
              <th className="col-numeric">Present</th>
              <th className="col-numeric">Absent</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {overview.employees.map((e) => (
              <tr key={e._id}>
                <td>
                  <div className="table-avatar">
                    {e.photo ? <img src={`${API_ORIGIN}${e.photo}`} alt="" /> : <span>{e.name?.[0]?.toUpperCase() || '?'}</span>}
                  </div>
                </td>
                <td>
                  {e.name}
                  {!e.isActive && <span className="you-tag"> (deactivated)</span>}
                </td>
                <td>
                  <span className={ROLE_BADGE[e.role] || 'badge'}>{roleLabel(e.role)}</span>
                </td>
                {showToday && (
                  <td>{e.todayStatus ? <StatusBadge status={e.todayStatus} /> : '—'}</td>
                )}
                <td className="cell-numeric">{e.present}</td>
                <td className="cell-numeric">{e.absent}</td>
                <td>
                  <button className="btn-link" onClick={() => setSelected(e)}>
                    {canEdit ? 'View / Edit' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------
// Page
// ---------------------------------------------------------------
function Attendance() {
  const { isAdmin, isManager } = useAuth();
  const tracksOwn = !isAdmin; // Staff + Manager have attendance; Admin does not
  const [view, setView] = useState(tracksOwn ? 'me' : 'team');

  const subtitle = isAdmin
    ? "Everyone's attendance (view only) - Sunday is the weekly day off"
    : isManager
      ? 'Check in, and review or correct your team\'s attendance - Sunday is the weekly day off'
      : 'Check in once a day and review your own attendance - Sunday is the weekly day off';

  return (
    <div className="page">
      <PageHeader title="Attendance" subtitle={subtitle} />

      {isManager && (
        <div className="pos-tabs">
          <button
            type="button"
            className={`pos-tab${view === 'me' ? ' pos-tab-active' : ''}`}
            onClick={() => setView('me')}
          >
            <CalendarCheck {...ICON_SM} /> My Attendance
          </button>
          <button
            type="button"
            className={`pos-tab${view === 'team' ? ' pos-tab-active' : ''}`}
            onClick={() => setView('team')}
          >
            <Users {...ICON_SM} /> Team Attendance
          </button>
        </div>
      )}

      {view === 'me' && tracksOwn && <MyAttendance />}
      {view === 'team' && (isAdmin || isManager) && <TeamAttendance canEdit={isManager} />}
    </div>
  );
}

export default Attendance;
