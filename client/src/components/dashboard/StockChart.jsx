// src/components/dashboard/StockChart.jsx
// Two small charts built with recharts, driven entirely by real data from
// the /api/dashboard/summary response - no hardcoded numbers.
// Animation (Phase 1 revision): entrance handled by Framer Motion.
//
// POLISH PASS: switched the pie to a donut with a centered total count
// and percentage labels (previously: plain leader-line numbers floating
// outside the slices, which looked unfinished) - visual polish only,
// the underlying data and role color themes are unchanged.

import { motion } from 'framer-motion';
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

const STATUS_COLORS = {
  'In Stock': '#12b76a',
  'Low Stock': '#f79009',
  'Out of Stock': '#f04438',
};

const cardMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
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
      <motion.div className="chart-card" {...cardMotion}>
        <h3>Stock Status Breakdown</h3>
        {pieData.length === 0 ? (
          <p className="empty-state">No products yet</p>
        ) : (
          <div className="donut-chart-wrap">
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
      </motion.div>

      <motion.div className="chart-card" {...cardMotion} transition={{ ...cardMotion.transition, delay: 0.05 }}>
        <h3>Products by Category</h3>
        {categoryBreakdown.length === 0 ? (
          <p className="empty-state">No products yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryBreakdown} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
              <Tooltip cursor={{ fill: 'rgba(79, 70, 229, 0.06)' }} />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}

export default StockChart;
