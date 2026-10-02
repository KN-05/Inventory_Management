// src/components/common/Card.jsx
// PHASE 2 (Reusable Components): wraps the existing .chart-card CSS
// class - the general "white rounded bordered section" pattern already
// used directly (<div className="chart-card"><h3>...</h3>...</div>)
// throughout Sales, Purchases, Products, Analytics, Reports, etc. Gives
// new code a single import instead of re-typing the wrapper + optional
// heading markup each time. Existing pages using the raw className are
// completely unaffected - this is purely additive.
//
// Usage:
//   <Card title="Add a product">...</Card>
//   <Card>...</Card>                          - no heading
//   <Card title="Cart" style={{ marginTop: '1rem' }}>...</Card>

function Card({ title, children, style, className = '' }) {
  return (
    <div className={`chart-card ${className}`.trim()} style={style}>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
}

export default Card;
