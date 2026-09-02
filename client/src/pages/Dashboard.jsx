// src/pages/Dashboard.jsx
// Every number and chart here comes from GET /api/dashboard/summary - a
// real backend aggregation over live MongoDB data (Phase 6). Navigation
// and logout now live in the shared Sidebar/Navbar (Phase 10), so this
// page focuses purely on the stats themselves.
//
// PHASE 4: Manager (Accountant/Manager) sees the same underlying data as
// Admin, but with stat cards reordered to lead with what they primarily
// care about per the spec ("finance, operations, inventory") - stock
// value and active alerts first, instead of raw product counts - plus a
// quick link into Reports, their main additional module.
//
// PHASE 5: Staff get a completely separate, simplified dashboard (see
// pages/staff/StaffDashboard.jsx) instead of a variant of this one, since
// they must not see the financial "Total Stock Value" figure at all. This
// component is left exactly as it was for Admin/Manager; only the early
// `isStaff` branch below is new.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../utils/roleLabel';
import { formatCurrency } from '../utils/formatCurrency';
import { getDashboardSummary } from '../api/dashboard';

import StatCard from '../components/dashboard/StatCard';
import StockChart from '../components/dashboard/StockChart';
import RecentActivity from '../components/dashboard/RecentActivity';
import Loader from '../components/common/Loader';
import StaffDashboard from './staff/StaffDashboard';

function Dashboard() {
  const { user, isManager, isStaff } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  // PHASE 5: Staff never need this Admin/Manager-shaped summary fetch at
  // all - they're handed off to <StaffDashboard /> below, which does its
  // own fetch. Hooks must still be called unconditionally on every
  // render, so the `isStaff` check lives inside the effect, not around it.
  useEffect(() => {
    if (isStaff) return;
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'));
  }, [isStaff]);

  // Hand off entirely to the dedicated, simplified Staff dashboard. Safe
  // to return early here since every hook above has already run.
  if (isStaff) {
    return <StaffDashboard />;
  }

  // Same 7 numbers for every role - only the ORDER changes, so a Manager's
  // financial/operational priorities (stock value, alerts) lead instead of
  // raw counts. No data is hidden; this is purely a presentation choice.
  const statCards = isManager
    ? [
        {
          key: 'stockValue',
          label: 'Total Stock Value',
          value: formatCurrency(summary?.totalStockValue),
          tone: 'success',
        },
        {
          key: 'activeAlerts',
          label: 'Active Alerts',
          value: summary?.activeAlertsCount,
          tone: summary?.activeAlertsCount > 0 ? 'warning' : 'default',
        },
        { key: 'lowStock', label: 'Low Stock', value: summary?.stockStatusBreakdown.lowStock, tone: 'warning' },
        { key: 'outOfStock', label: 'Out of Stock', value: summary?.stockStatusBreakdown.outOfStock, tone: 'danger' },
        { key: 'totalProducts', label: 'Total Products', value: summary?.totalProducts },
        { key: 'totalSuppliers', label: 'Total Suppliers', value: summary?.totalSuppliers },
        { key: 'totalCategories', label: 'Total Categories', value: summary?.totalCategories },
      ]
    : [
        { key: 'totalProducts', label: 'Total Products', value: summary?.totalProducts },
        { key: 'lowStock', label: 'Low Stock', value: summary?.stockStatusBreakdown.lowStock, tone: 'warning' },
        { key: 'outOfStock', label: 'Out of Stock', value: summary?.stockStatusBreakdown.outOfStock, tone: 'danger' },
        { key: 'totalSuppliers', label: 'Total Suppliers', value: summary?.totalSuppliers },
        { key: 'totalCategories', label: 'Total Categories', value: summary?.totalCategories },
        {
          key: 'activeAlerts',
          label: 'Active Alerts',
          value: summary?.activeAlertsCount,
          tone: summary?.activeAlertsCount > 0 ? 'warning' : 'default',
        },
        {
          key: 'stockValue',
          label: 'Total Stock Value',
          value: formatCurrency(summary?.totalStockValue),
          tone: 'success',
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
        {isManager && (
          <Link to="/admin/reports" className="btn-secondary" style={{ textDecoration: 'none' }}>
            View Reports
          </Link>
        )}
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

export default Dashboard;
