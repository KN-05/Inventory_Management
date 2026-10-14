// src/components/dashboard/PanelState.jsx
// The three states every dashboard section needs besides "has data":
// loading (fixed-height placeholders so the layout doesn't jump), error
// (what went wrong + a retry), and empty (what the user can do next).

export function PanelLoading({ rows = 4 }) {
  return (
    <div className="panel-body" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 14, marginBottom: 14, width: i % 2 ? '82%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function PanelError({ message, onRetry }) {
  return (
    <div className="panel-empty" role="alert">
      <strong>Couldn't load this section</strong>
      {message}
      {onRetry && (
        <div style={{ marginTop: '0.6rem' }}>
          <button type="button" className="btn-link" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export function PanelEmpty({ title, children, action }) {
  return (
    <div className="panel-empty">
      <strong>{title}</strong>
      {children}
      {action && <div style={{ marginTop: '0.6rem' }}>{action}</div>}
    </div>
  );
}
