// src/components/dashboard/RecentActivity.jsx
// Lists the most recent ActivityLog entries (created by the backend every
// time a product/category/supplier is created, updated, deleted, or
// stock is adjusted - see Phase 4/5's logActivity() calls).
//
// PHASE 18: added a small icon per `module` value (the exact set the
// backend actually logs - see logActivity() call sites) purely for visual
// scanning; falls back to a neutral dot for any value not in the map so
// nothing ever renders blank.

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

const MODULE_ICONS = {
  product: '📦',
  category: '🗂️',
  supplier: '🚚',
  purchase: '🧾',
  sale: '💰',
  customer: '🙍',
  stock: '📉',
  user: '👤',
  auth: '🔐',
};

function RecentActivity({ activities }) {
  if (activities.length === 0) {
    return <p className="empty-state">No activity yet. Actions you take will show up here.</p>;
  }

  return (
    <ul className="activity-list">
      {activities.map((a) => (
        <li key={a.id}>
          <span className="activity-text">
            <span className="activity-icon" aria-hidden="true">
              {MODULE_ICONS[a.module] || '•'}
            </span>
            <strong>{a.user}</strong> {a.action}
          </span>
          <span className="activity-time">{timeAgo(a.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

export default RecentActivity;

