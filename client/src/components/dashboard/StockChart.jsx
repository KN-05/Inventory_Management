// src/components/dashboard/StockChart.jsx
// Two charts built with recharts, driven entirely by real data from the
// /api/dashboard/summary response - no hardcoded numbers.
//
// Stock status donut: colours follow the app theme (main segment = the
// theme's primary colour, Low Stock = a softer tint of it, Out of Stock =
// the danger red). Because they come from CSS variables they also follow the
// per-role theme.
//
// Products by category: a HORIZONTAL bar chart. Category names such as
// "Mobile & Accessories" are long, and on a vertical chart recharts silently
// drops labels that would collide - which is why some bars had no name. Here
// every category gets its own row with its name on the left (interval 0 =
// never skip a label), long names are shortened with an ellipsis, and the
// tooltip always shows the full name and the product count.

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from 'recharts';

const STATUS_COLORS = {
  'In Stock': 'var(--color-primary)',
  'Low Stock': 'color-mix(in srgb, var(--color-primary) 38%, #ffffff)',
  'Out of Stock': 'var(--color-danger)',
};

// Text colour of the % label drawn on each slice (the light slice needs dark text).
const STATUS_LABEL_COLORS = {
  'In Stock': '#ffffff',
  'Low Stock': 'var(--color-primary-hover)',
  'Out of Stock': '#ffffff',
};

function renderPercentLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.06) return null; // skip labels on slivers too thin to read
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill={STATUS_LABEL_COLORS[name] || '#fff'}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

const MAX_LABEL_CHARS = 22;
const shortLabel = (text) =>
  String(text).length > MAX_LABEL_CHARS ? `${String(text).slice(0, MAX_LABEL_CHARS - 1)}…` : String(text);

function CategoryTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const { category, count } = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{category}</strong>
      <span>
        {count} {count === 1 ? 'product' : 'products'}
      </span>
    </div>
  );
}

function StatusTooltip({ active, payload, total }) {
  if (!active || !payload || payload.length === 0) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="chart-tooltip">
      <strong>{name}</strong>
      <span>
        {value} {value === 1 ? 'product' : 'products'} ({pct}%)
      </span>
    </div>
  );
}

function StockChart({ stockStatusBreakdown, categoryBreakdown }) {
  const pieData = [
    { name: 'In Stock', value: stockStatusBreakdown.inStock },
    { name: 'Low Stock', value: stockStatusBreakdown.lowStock },
    { name: 'Out of Stock', value: stockStatusBreakdown.outOfStock },
  ].filter((d) => d.value > 0);

  const totalProducts = pieData.reduce((sum, d) => sum + d.value, 0);

  // Largest category first; a copy, so the API data itself is never mutated.
  const categoryData = [...categoryBreakdown].sort(
    (a, b) => b.count - a.count || String(a.category).localeCompare(String(b.category))
  );
  const longestLabel = categoryData.reduce((max, d) => Math.max(max, shortLabel(d.category).length), 0);
  const labelWidth = Math.min(170, Math.max(90, longestLabel * 7 + 8));
  const barChartHeight = Math.max(220, categoryData.length * 44 + 56);

  return (
    <div className="charts-grid">
      <section className="panel chart-panel" aria-label="Stock status breakdown">
        <div className="panel-header">
          <h2 className="panel-title">Stock status</h2>
          <span className="panel-note">Share of all products</span>
        </div>
        {pieData.length === 0 ? (
          <div className="panel-empty">
            <strong>No products yet</strong>
            Add products to see how your stock is distributed.
          </div>
        ) : (
          <div className="panel-body chart-body">
            <div className="donut-chart-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={66}
                    outerRadius={98}
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
                  <Tooltip content={<StatusTooltip total={totalProducts} />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Centered total, sitting in the donut's hole */}
              <div className="donut-chart-center">
                <span className="donut-chart-center-value">{totalProducts}</span>
                <span className="donut-chart-center-label">Products</span>
              </div>
            </div>

            {/* Legend: centered under the chart, with the real counts */}
            <ul className="chart-legend">
              {pieData.map((d) => (
                <li key={d.name}>
                  <span className="chart-legend-dot" style={{ background: STATUS_COLORS[d.name] }} />
                  <span className="chart-legend-name">{d.name}</span>
                  <span className="chart-legend-count">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel chart-panel" aria-label="Products by category">
        <div className="panel-header">
          <h2 className="panel-title">Products by category</h2>
          <span className="panel-note">Number of products in each category</span>
        </div>
        {categoryData.length === 0 ? (
          <div className="panel-empty">
            <strong>No products yet</strong>
            Products will be grouped by category here.
          </div>
        ) : (
          <div className="panel-body chart-body">
            <ResponsiveContainer width="100%" height={barChartHeight}>
              <BarChart
                data={categoryData}
                layout="vertical"
                barSize={22}
                margin={{ top: 4, right: 32, bottom: 22, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                  label={{
                    value: 'Number of products',
                    position: 'insideBottom',
                    offset: -12,
                    fontSize: 12,
                    fill: 'var(--color-text-muted)',
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={labelWidth}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={shortLabel}
                  tick={{ fontSize: 12, fill: 'var(--color-text)' }}
                />
                <Tooltip content={<CategoryTooltip />} cursor={{ fill: 'var(--color-primary-bg)' }} />
                <Bar
                  dataKey="count"
                  name="Products"
                  fill="var(--color-primary)"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                >
                  {/* the number at the end of each bar - also makes a 0 visible */}
                  <LabelList dataKey="count" position="right" fontSize={12} fill="var(--color-text-secondary)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

export default StockChart;
