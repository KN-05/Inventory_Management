// src/components/common/EmptyState.jsx
// PHASE 2 (Reusable Components): wraps the existing .empty-state CSS
// class (already used as plain <p className="empty-state">...</p> text
// across Products, Sales, Purchases, StockAlerts, etc). Adds an optional
// icon and action button slot without changing the existing look for
// any page still using the plain <p> version directly.
//
// Usage:
//   <EmptyState message="No products found." />
//   <EmptyState icon="📦" title="No products yet" message="Add your first product to get started." action={<Button>+ Add Product</Button>} />

function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state">
      {icon && (
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }} aria-hidden="true">
          {icon}
        </div>
      )}
      {title && <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: 'var(--color-text)' }}>{title}</p>}
      <p style={{ margin: 0 }}>{message}</p>
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  );
}

export default EmptyState;
