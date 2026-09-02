// src/components/dashboard/RecentActivity.jsx
// Lists the most recent ActivityLog entries (created by the backend every
// time a product/category/supplier is created, updated, deleted, or
// stock is adjusted - see Phase 4/5's logActivity() calls).

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
    return <p className="empty-state">No activity yet. Actions you take will show up here.</p>;
  }

  return (
    <ul className="activity-list">
      {activities.map((a) => (
        <li key={a.id}>
          <span className="activity-text">
            <strong>{a.user}</strong> {a.action}
          </span>
          <span className="activity-time">{timeAgo(a.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

export default RecentActivity;
