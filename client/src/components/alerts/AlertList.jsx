// src/components/alerts/AlertList.jsx
// Animation (Phase 1 revision): each alert item fades/slides in with a
// small stagger, and lifts slightly on hover - both via Framer Motion.

import Button from '../common/Button';

const badgeClass = {
  'Low Stock': 'badge badge-yellow',
  'Out of Stock': 'badge badge-red',
};

function AlertList({ alerts, onResolve }) {
  if (alerts.length === 0) {
    return <p className="empty-state">No alerts here. Everything looks good.</p>;
  }

  return (
    <ul className="alert-list">
      {alerts.map((alert) => (
        <li
          key={alert._id}
          className="alert-item"
        >
          <div>
            <span className={badgeClass[alert.product?.status] || 'badge'}>
              {alert.product?.status || 'Unknown'}
            </span>
            <p className="alert-message">{alert.message}</p>
            <p className="alert-meta">
              SKU: {alert.product?.sku || '-'} • {new Date(alert.createdAt).toLocaleString()}
            </p>
          </div>
          {alert.status === 'active' && (
            <Button variant="secondary" onClick={() => onResolve(alert)}>
              Mark Resolved
            </Button>
          )}
          {alert.status === 'resolved' && <span className="badge badge-green">Resolved</span>}
        </li>
      ))}
    </ul>
  );
}

export default AlertList;
