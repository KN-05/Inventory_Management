// src/components/dashboard/SalesOverviewChart.jsx
// Daily sales for the last 14 days, from the same GET /api/admin/analytics/
// sales `daily` data the Analytics page uses ({ date, total, count }).
//
// The backend only returns days that HAD sales, so a plain plot of that
// array would squeeze unrelated dates together and hide quiet days. Here
// every one of the last 14 days is drawn, with 0 for days without sales,
// so the horizontal axis is real time. Dates follow the backend's grouping
// (UTC calendar days). Axis ticks use compact Indian units (K / L / Cr);
// the tooltip shows the full amount.

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import { PanelLoading, PanelError, PanelEmpty } from './PanelState';

const DAYS = 14;
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

function buildSeries(daily) {
  const totals = new Map((daily || []).map((d) => [d.date, d.total]));
  const now = new Date();
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (DAYS - 1 - i)));
    const key = d.toISOString().slice(0, 10);
    return {
      date: key,
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
      fullDate: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
      total: totals.get(key) || 0,
    };
  });
}

function SalesOverviewChart({ daily, loading, error, onRetry }) {
  const series = buildSeries(daily);
  const periodTotal = series.reduce((sum, d) => sum + d.total, 0);

  return (
    <section className="panel" aria-label="Sales overview">
      <div className="panel-header">
        <h2 className="panel-title">Sales overview</h2>
        {!loading && !error && <span className="panel-note">Last {DAYS} days: {formatCurrency(periodTotal)}</span>}
      </div>

      {loading ? (
        <PanelLoading rows={5} />
      ) : error ? (
        <PanelError message={error} onRetry={onRetry} />
      ) : periodTotal === 0 ? (
        <PanelEmpty title={`No sales in the last ${DAYS} days`}>
          Completed sales will be charted here by day.
        </PanelEmpty>
      ) : (
        <div className="panel-body">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                axisLine={false}
                tickLine={false}
                minTickGap={18}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v) => `₹${compact.format(v)}`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Sales']}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
              />
              <Line
                type="linear"
                dataKey="total"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default SalesOverviewChart;
