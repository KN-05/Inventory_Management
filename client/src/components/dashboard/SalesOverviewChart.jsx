// src/components/dashboard/SalesOverviewChart.jsx
// PHASE 18: "Sales Overview" line chart for the Admin/Manager Dashboard,
// requested to match the reference design. Uses the SAME real data as the
// existing Analytics page (GET /api/admin/analytics/sales -> `daily`
// array of { date, total, count }) - no new backend endpoint, no fake
// numbers. Only rendered for Admin/Manager (Staff never fetches this).

import { motion } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

function SalesOverviewChart({ daily }) {
  // `daily` is already sorted oldest -> newest and capped to the last 30
  // active days by the backend. Show the most recent 14 for a chart that
  // stays readable without needing to scroll/zoom.
  const data = (daily || []).slice(-14).map((d) => ({ ...d, label: d.date.slice(5) })); // "MM-DD"

  return (
    <motion.div
      className="chart-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <h3>Sales Overview</h3>
      {data.length === 0 ? (
        <p className="empty-state">No completed sales yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={46}
              tickFormatter={(v) => formatCurrency(v)}
            />
            <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(l) => `Date: ${l}`} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--color-primary)' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}

export default SalesOverviewChart;
