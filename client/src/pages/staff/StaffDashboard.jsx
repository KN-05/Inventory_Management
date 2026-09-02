// src/pages/staff/StaffDashboard.jsx
// PHASE 5: a dedicated, simplified dashboard for the Staff role.
//
// Staff get their own view instead of the Admin/Manager Dashboard because
// the spec is explicit that Staff must NOT see financial analytics or
// profit/loss-type figures ("Total Stock Value" is a monetary sum of
// quantity * price). Rather than hiding that one field inside the shared
// Dashboard.jsx (and risking it leaking back in during a future edit),
// this page only ever asks for/renders the operational, non-monetary
// numbers a Staff member needs to run daily stock work: how many products
// exist, what's low/out of stock, how many active alerts need attention,
// and a quick look at recent activity. The backend also never sends
// totalStockValue to a Staff user (see dashboardController.js), so this
// is defense-in-depth, not the only safeguard.
//
// Reuses the exact same StatCard/StockChart/RecentActivity/Loader
// components as the Admin/Manager Dashboard, so the visual language stays
// identical - only the amber `data-theme="staff"` (set by DashboardLayout)
// and the simpler set of cards make it feel distinct.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roleLabel';
import { getDashboardSummary } from '../../api/dashboard';

import StatCard from '../../components/dashboard/StatCard';
import StockChart from '../../components/dashboard/StockChart';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Loader from '../../components/common/Loader';

function StaffDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'));
  }, []);

  // Deliberately fewer cards than the Admin/Manager dashboard, and no
  // "Total Stock Value" card - that's the one figure Staff must not see.
  const statCards = [
    { key: 'totalProducts', label: 'Total Products', value: summary?.totalProducts },
    { key: 'lowStock', label: 'Low Stock', value: summary?.stockStatusBreakdown.lowStock, tone: 'warning' },
    { key: 'outOfStock', label: 'Out of Stock', value: summary?.stockStatusBreakdown.outOfStock, tone: 'danger' },
    {
      key: 'activeAlerts',
      label: 'Active Alerts',
      value: summary?.activeAlertsCount,
      tone: summary?.activeAlertsCount > 0 ? 'warning' : 'default',
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.name}</strong> ({roleLabel(user?.role)})
          </p>
        </div>
        <Link to="/products" className="btn-secondary" style={{ textDecoration: 'none' }}>
          Go to Products
        </Link>
      </div>

      {error && <p className="banner banner-error">{error}</p>}

      {!summary ? (
        <Loader label="Loading dashboard..." />
      ) : (
        <>
          <div className="stats-grid">
            {statCards.map((card, index) => (
              <StatCard key={card.key} index={index} label={card.label} value={card.value} tone={card.tone} />
            ))}
          </div>

          <StockChart
            stockStatusBreakdown={summary.stockStatusBreakdown}
            categoryBreakdown={summary.categoryBreakdown}
          />

          <motion.div
            className="chart-card"
            style={{ marginTop: '1rem' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <h3>Recent Activity</h3>
            <RecentActivity activities={summary.recentActivities} />
          </motion.div>
        </>
      )}
    </div>
  );
}

export default StaffDashboard;
