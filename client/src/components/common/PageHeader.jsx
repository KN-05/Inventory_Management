// src/components/common/PageHeader.jsx
// PHASE 2 (Reusable Components): wraps the existing .page-header /
// .page-subtitle CSS pattern (already used as plain <div className=
// "page-header"><h1>...</h1></div> markup at the top of Products,
// Sales, Purchases, Dashboard, etc). Adds a standard right-aligned
// `actions` slot (buttons) so every page builds its header the same
// way instead of re-laying it out by hand each time.
//
// Usage:
//   <PageHeader title="Products" />
//   <PageHeader
//     title="Products"
//     subtitle="Manage your inventory catalog"
//     actions={<Button variant="primary">+ Add Product</Button>}
//   />

function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export default PageHeader;
