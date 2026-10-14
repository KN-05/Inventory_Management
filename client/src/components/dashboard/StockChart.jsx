// src/components/dashboard/StockChart.jsx
// Two small charts built with recharts, driven entirely by real data from
// the /api/dashboard/summary response - no hardcoded numbers.
// Animation (Phase 1 revision): entrance handled by Framer Motion.
//
// POLISH PASS: switched the pie to a donut with a centered total count
// and percentage labels (previously: plain leader-line numbers floating
// outside the slices, which looked unfinished) - visual polish only,
// the underlying data and role color themes are unchanged.

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// Status colours match the badge colours used in the tables.
const STATUS_COLORS = {
  'In Stock': '#16a34a',
  'Low Stock': '#d97706',
  'Out of Stock': '#dc2626',
};

// Renders "37%" centered on each slice instead of recharts' default
// leader-line + raw number, which is what was floating awkwardly
// outside the pie before.
function renderPercentLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null; // skip labels on slivers too thin to read
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

function StockChart({ stockStatusBreakdown, categoryBreakdown }) {
  const pieData = [
    { name: 'In Stock', value: stockStatusBreakdown.inStock },
    { name: 'Low Stock', value: stockStatusBreakdown.lowStock },
    { name: 'Out of Stock', value: stockStatusBreakdown.outOfStock },
  ].filter((d) => d.value > 0);

  const totalProducts = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="charts-grid">
      <section className="panel" aria-label="Stock status breakdown">
        <div className="panel-header">
          <h2 className="panel-title">Stock status</h2>
        </div>
        {pieData.length === 0 ? (
          <div className="panel-empty">
            <strong>No products yet</strong>
            Add products to see how your stock is distributed.
          </div>
        ) : (
          <div className="donut-chart-wrap panel-body">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                  label={renderPercentLabel}
                  labelLine={false}
                  isAnimationActive={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            {/* Centered total, sitting in the donut's hole */}
            <div className="donut-chart-center">
              <span className="donut-chart-center-value">{totalProducts}</span>
              <span className="donut-chart-center-label">Products</span>
            </div>
          </div>
        )}
      </section>

      <section className="panel" aria-label="Products by category">
        <div className="panel-header">
          <h2 className="panel-title">Products by category</h2>
        </div>
        {categoryBreakdown.length === 0 ? (
          <div className="panel-empty">
            <strong>No products yet</strong>
            Products will be grouped by category here.
          </div>
        ) : (
          <div className="panel-body">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryBreakdown} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  tick={{ fill: 'var(--color-text-secondary)' }}
                />
                <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
                <Bar dataKey="count" name="Products" fill="var(--color-primary)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

export default StockChart;
