// src/components/dashboard/RecentActivity.jsx
// Lists the most recent ActivityLog entries (written by the backend's
// logActivity() whenever someone creates/updates/deletes something).
// Each row is a 3-column grid: module icon | who + what happened | time.
// Long descriptions (emails, invoice numbers, amounts) wrap inside their own
// column and never push the icon or the time out of line. Hovering the time
// shows the exact date and time.

import ModuleIcon from '../common/ModuleIcon';

function timeAgo(dateString) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function RecentActivity({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="panel-empty">
        <strong>No activity yet</strong>
        Actions your team takes will be listed here.
      </div>
    );
  }

  return (
    // The list scrolls inside the card once it gets long, so a busy activity
    // log can't stretch the whole dashboard.
    <div className="activity-scroll">
      <ul className="activity-list">
        {activities.map((a) => (
          <li key={a.id}>
            <span className="activity-icon" aria-hidden="true">
              <ModuleIcon module={a.module} />
            </span>
            <div className="activity-body">
              <span className="activity-user">{a.user}</span>
              <span className="activity-desc">{a.action}</span>
            </div>
            <time
              className="activity-time"
              dateTime={new Date(a.createdAt).toISOString()}
              title={new Date(a.createdAt).toLocaleString()}
            >
              {timeAgo(a.createdAt)}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RecentActivity;
