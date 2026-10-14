// src/components/dashboard/RecentActivity.jsx
// Lists the most recent ActivityLog entries (written by the backend's
// logActivity() whenever someone creates/updates/deletes something).
// Each row: module icon, who did what, and when. Hovering the time shows
// the exact date and time.

import ModuleIcon from '../common/ModuleIcon';

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function RecentActivity({ activities }) {
  if (activities.length === 0) {
    return (
      <div className="panel-empty">
        <strong>No activity yet</strong>
        Actions your team takes will be listed here.
      </div>
    );
  }

  return (
    <ul className="activity-list">
      {activities.map((a) => (
        <li key={a.id}>
          <span className="activity-text">
            <span className="activity-icon" aria-hidden="true">
              <ModuleIcon module={a.module} />
            </span>
            <strong>{a.user}</strong> {a.action}
          </span>
          <span className="activity-time" title={new Date(a.createdAt).toLocaleString()}>
            {timeAgo(a.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default RecentActivity;
