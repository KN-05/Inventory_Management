// src/components/dashboard/KpiGroup.jsx
// One labelled strip of metrics: a single bordered block with hairline
// dividers between cells (instead of a wall of separate cards). Each item
// loads and fails independently:
//   { key, label, icon, value, sub, tone, to, loading, error }
// `tone` is "warning" (amber) or "danger" (red) and is only passed when the
// number actually signals a problem - ordinary figures stay neutral.
// `to` makes the whole cell a link to the page behind the number.

import { Link } from 'react-router-dom';
import { ICON_SM } from '../../utils/iconProps';

function Cell({ item }) {
  const Icon = item.icon;
  const toneClass = item.tone ? ` kpi-value-${item.tone}` : '';

  const body = (
    <>
      <div className="kpi-head">
        <span className="kpi-label">{item.label}</span>
        <span className="kpi-icon" aria-hidden="true">
          <Icon {...ICON_SM} />
        </span>
      </div>
      <div className={`kpi-value${toneClass}`}>
        {item.loading ? <span className="skeleton kpi-skeleton" aria-label="Loading" /> : item.error ? '—' : item.value}
      </div>
      <div className="kpi-sub">{item.loading ? '\u00a0' : item.error ? 'Unavailable' : item.sub}</div>
    </>
  );

  return item.to ? (
    <Link to={item.to} className="kpi">
      {body}
    </Link>
  ) : (
    <div className="kpi">{body}</div>
  );
}

function KpiGroup({ title, columns = 3, items }) {
  return (
    <section className="kpi-group" aria-label={title}>
      <h2 className="kpi-group-title">{title}</h2>
      <div className={`kpi-grid kpi-grid-${columns}`}>
        {items.map((item) => (
          <Cell key={item.key} item={item} />
        ))}
      </div>
    </section>
  );
}

export default KpiGroup;
