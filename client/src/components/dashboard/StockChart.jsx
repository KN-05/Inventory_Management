// src/components/dashboard/StockChart.jsx
// Two small charts built with recharts, driven entirely by real data from
// the /api/dashboard/summary response - no hardcoded numbers.
// Animation (Phase 1 revision): entrance handled by Framer Motion.

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

function StockChart({ stockStatusBreakdown, categoryBreakdown }) {
  const pieData = [
    { name: 'In Stock', value: stockStatusBreakdown.inStock },
    { name: 'Low Stock', value: stockStatusBreakdown.lowStock },
    { name: 'Out of Stock', value: stockStatusBreakdown.outOfStock },
  ].filter((d) => d.value > 0);

  return (
    <div className="charts-grid">
      <motion.div className="chart-card" {...cardMotion}>
        <h3>Stock Status Breakdown</h3>
        {pieData.length === 0 ? (
          <p className="empty-state">No products yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      <motion.div className="chart-card" {...cardMotion} transition={{ ...cardMotion.transition, delay: 0.05 }}>
        <h3>Products by Category</h3>
        {categoryBreakdown.length === 0 ? (
          <p className="empty-state">No products yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}

export default StockChart;
