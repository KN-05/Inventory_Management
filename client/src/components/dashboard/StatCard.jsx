// src/components/dashboard/StatCard.jsx
// A small metric tile: label + icon on top, one large number below.
// Used on several pages (Stock Alerts, Attendance, User Management,
// Analytics, Reports).
//
// Colour is reserved for meaning: `tone="warning"` (amber) and
// `tone="danger"` (red) colour the value and icon; every other tone
// ("default", "success") stays neutral - a number isn't "good" just because
// it's a revenue figure. No entrance animation, no hover lift.
//
// `icon` is any React node (pass a lucide icon element). `index` is
// accepted for backwards compatibility with existing call sites.

function StatCard({ icon, label, value, tone = 'default' }) {
  const toneClass = tone === 'warning' || tone === 'danger' ? ` stat-card-${tone}` : '';

  return (
    <div className={`stat-card${toneClass}`}>
      <div className="stat-card-head">
        <p className="stat-card-label">{label}</p>
        {icon && (
          <span className="stat-card-icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="stat-card-value">{value}</p>
    </div>
  );
}

export default StatCard;
