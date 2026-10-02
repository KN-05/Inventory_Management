// src/components/common/Badge.jsx
// PHASE 2 (Reusable Components): a small wrapper around the existing
// .badge / .badge-green / .badge-yellow / .badge-red / .badge-blue CSS
// classes (already used directly as plain <span className="..."> all
// over the app - ProductTable, ProductDetailsModal, SalesHistoryTable,
// StockAlerts, etc). This component doesn't change how any of those
// look (same classes, same CSS) - it just gives new code one place to
// import instead of re-typing the className + status-to-color mapping
// each time, and a `status` shortcut for the common
// In Stock/Low Stock/Out of Stock/Paid/Pending/etc. case.
//
// Usage:
//   <Badge variant="green">Active</Badge>
//   <Badge status="Low Stock" />        - looks up the right color itself
//   <Badge status="paid" />

const STATUS_VARIANT_MAP = {
  'in stock': 'green',
  'low stock': 'yellow',
  'out of stock': 'red',
  paid: 'green',
  pending: 'yellow',
  completed: 'green',
  cancelled: 'red',
  active: 'green',
  resolved: 'blue',
  purchase: 'green',
  sale: 'red',
  return: 'green',
  adjustment: 'yellow',
  damage: 'red',
};

function Badge({ variant, status, children }) {
  const resolvedVariant = variant || STATUS_VARIANT_MAP[(status || '').toLowerCase()] || 'blue';
  const label = children ?? status;

  return <span className={`badge badge-${resolvedVariant}`}>{label}</span>;
}

export default Badge;
