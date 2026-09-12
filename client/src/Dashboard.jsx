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
//
// PHASE 18: visual refresh to match the reference SaaS design - a
// time-of-day greeting, an icon on every stat card, and (Admin/Manager
// only) two more REAL stat cards - Total Sales and Total Purchases - plus
// a "Sales Overview" line chart. All three reuse the exact same
// api/admin.js analytics calls the existing Analytics page already uses
// (GET /api/admin/analytics/sales|purchases) - no new backend endpoint,
// no invented numbers. If that extra fetch fails for any reason the two
// cards/chart are simply omitted; the core summary above is unaffected.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { roleLabel } from '../utils/roleLabel';
import { formatCurrency } from '../utils/formatCurrency';
import { getDashboardSummary } from '../api/dashboard';
import { getSalesAnalytics, getPurchaseAnalytics } from '../api/admin';

import StatCard from '../components/dashboard/StatCard';
import StockChart from '../components/dashboard/StockChart';
import SalesOverviewChart from '../components/dashboard/SalesOverviewChart';
import RecentActivity from '../components/dashboard/RecentActivity';
import Loader from '../components/common/Loader';
import StaffDashboard from './staff/StaffDashboard';

// Plain, honest greeting based on the visitor's own clock - not a fake
// personalization claim, just `new Date().getHours()`.
function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function Dashboard() {
  const { user, isAdmin, isManager, isStaff } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [salesAnalytics, setSalesAnalytics] = useState(null);
  const [purchaseAnalytics, setPurchaseAnalytics] = useState(null);

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

  // PHASE 18: Sales/Purchase analytics power the two extra stat cards +
  // the line chart, Admin/Manager only (same permission the Analytics
  // page already requires). Fetched separately from the summary above so
  // a failure here never blocks the core dashboard from rendering.
  useEffect(() => {
    if (isStaff || !(isAdmin || isManager)) return;
    getSalesAnalytics().then(setSalesAnalytics).catch(() => {});
    getPurchaseAnalytics().then(setPurchaseAnalytics).catch(() => {});
  }, [isStaff, isAdmin, isManager]);

  // Hand off entirely to the dedicated, simplified Staff dashboard. Safe
  // to return early here since every hook above has already run.
  if (isStaff) {
    return <StaffDashboard />;
  }

  // Same numbers for every role - only the ORDER changes, so a Manager's
  // financial/operational priorities (stock value, alerts) lead instead of
  // raw counts. No data is hidden; this is purely a presentation choice.
  const salesCard = salesAnalytics && {
    key: 'totalSales',
    label: 'Total Sales',
    value: formatCurrency(salesAnalytics.totalRevenue),
    tone: 'success',
    icon: '💵',
  };
  const purchasesCard = purchaseAnalytics && {
    key: 'totalPurchases',
    label: 'Total Purchases',
    value: formatCurrency(purchaseAnalytics.totalValue),
    tone: 'default',
    icon: '🧾',
  };

  const statCards = isManager
    ? [
        salesCard,
        purchasesCard,
        {
          key: 'stockValue',
          label: 'Total Stock Value',
          value: formatCurrency(summary?.totalStockValue),
          tone: 'success',
          icon: '💰',
        },
        {
          key: 'activeAlerts',
          label: 'Active Alerts',
          value: summary?.activeAlertsCount,
          tone: summary?.activeAlertsCount > 0 ? 'warning' : 'default',
          icon: '🔔',
        },
        { key: 'lowStock', label: 'Low Stock', value: summary?.stockStatusBreakdown.lowStock, tone: 'warning', icon: '⚠️' },
        {
          key: 'outOfStock',
          label: 'Out of Stock',
          value: summary?.stockStatusBreakdown.outOfStock,
          tone: 'danger',
          icon: '🚫',
        },
        { key: 'totalProducts', label: 'Total Products', value: summary?.totalProducts, icon: '📦' },
        { key: 'totalSuppliers', label: 'Total Suppliers', value: summary?.totalSuppliers, icon: '🚚' },
        { key: 'totalCategories', label: 'Total Categories', value: summary?.totalCategories, icon: '🗂️' },
      ].filter(Boolean)
    : [
        { key: 'totalProducts', label: 'Total Products', value: summary?.totalProducts, icon: '📦' },
        salesCard,
        purchasesCard,
        { key: 'lowStock', label: 'Low Stock', value: summary?.stockStatusBreakdown.lowStock, tone: 'warning', icon: '⚠️' },
        {
          key: 'outOfStock',
          label: 'Out of Stock',
          value: summary?.stockStatusBreakdown.outOfStock,
          tone: 'danger',
          icon: '🚫',
        },
        { key: 'totalSuppliers', label: 'Total Suppliers', value: summary?.totalSuppliers, icon: '🚚' },
        { key: 'totalCategories', label: 'Total Categories', value: summary?.totalCategories, icon: '🗂️' },
        {
          key: 'activeAlerts',
          label: 'Active Alerts',
          value: summary?.activeAlertsCount,
          tone: summary?.activeAlertsCount > 0 ? 'warning' : 'default',
          icon: '🔔',
        },
        {
          key: 'stockValue',
          label: 'Total Stock Value',
          value: formatCurrency(summary?.totalStockValue),
          tone: 'success',
          icon: '💰',
        },
      ].filter(Boolean);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>
            {timeGreeting()}, {user?.name} <span aria-hidden="true">👋</span>
          </h1>
          <p className="page-subtitle">
            Here's what's happening with your inventory today. ({roleLabel(user?.role)})
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
              <StatCard
                key={card.key}
                index={index}
                label={card.label}
                value={card.value}
                tone={card.tone}
                icon={card.icon}
              />
            ))}
          </div>

          {salesAnalytics && (
            <div style={{ marginTop: '1rem' }}>
              <SalesOverviewChart daily={salesAnalytics.daily} />
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <StockChart
              stockStatusBreakdown={summary.stockStatusBreakdown}
              categoryBreakdown={summary.categoryBreakdown}
            />
          </div>

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

