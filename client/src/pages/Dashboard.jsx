// src/pages/Dashboard.jsx
// Admin / Manager dashboard. Every figure comes from a real backend call:
//   GET /api/dashboard/summary        - counts, stock value, alerts, activity
//   GET /api/admin/analytics/sales    - total revenue + daily sales
//   GET /api/admin/analytics/purchases- total purchase value
//   GET /api/sales, /api/purchases    - the latest transactions
//   GET /api/products?status=...      - products at/below their reorder level
// Nothing is hard-coded or estimated. Each section loads on its own, so a
// failed request shows an error only in that section.
//
// Staff get a separate, simpler dashboard (pages/staff/StaffDashboard.jsx)
// because they must not see financial totals such as stock value.
//
// Layout: header + quick actions, two KPI strips (business / inventory),
// then a two-column working area (sales chart + recent transactions beside
// low-stock products + recent activity), then the stock charts.

import { Link } from 'react-router-dom';
import {
  Plus,
  ShoppingCart,
  ShoppingBag,
  CalendarDays,
  IndianRupee,
  Wallet,
  Package,
  TriangleAlert,
  PackageX,
  CircleAlert,
  Truck,
  Tags,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { formatCurrency } from '../utils/formatCurrency';
import { ICON_SM } from '../utils/iconProps';
import { useLoad } from '../utils/useLoad';
import { getDashboardSummary } from '../api/dashboard';
import { getSalesAnalytics, getPurchaseAnalytics } from '../api/admin';
import { getSales } from '../api/sales';
import { getPurchases } from '../api/purchases';
import { getProducts } from '../api/products';

import KpiGroup from '../components/dashboard/KpiGroup';
import StockChart from '../components/dashboard/StockChart';
import SalesOverviewChart from '../components/dashboard/SalesOverviewChart';
import RecentActivity from '../components/dashboard/RecentActivity';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import LowStockTable from '../components/dashboard/LowStockTable';
import { PanelError, PanelLoading } from '../components/dashboard/PanelState';
import StaffDashboard from './staff/StaffDashboard';

// ---- loaders (module level so their identity is stable for useLoad) ----
const loadSummary = () => getDashboardSummary();
const loadSalesAnalytics = () => getSalesAnalytics();
const loadPurchaseAnalytics = () => getPurchaseAnalytics();

// Latest sales + purchase orders merged into one newest-first list.
const loadTransactions = async () => {
  const [salesRes, purchasesRes] = await Promise.allSettled([
    getSales({ limit: 6 }),
    getPurchases({ limit: 6 }),
  ]);
  // If both fail there is nothing to show - surface the error. If only one
  // fails, still show the other rather than hiding everything.
  if (salesRes.status === 'rejected' && purchasesRes.status === 'rejected') throw salesRes.reason;

  const sales = salesRes.status === 'fulfilled' ? salesRes.value.sales : [];
  const purchases = purchasesRes.status === 'fulfilled' ? purchasesRes.value.purchases : [];

  return [
    ...sales.map((s) => ({
      type: 'sale',
      id: s._id,
      reference: s.invoiceNumber,
      party: s.customer?.name || 'Walk-in customer',
      date: s.createdAt,
      amount: s.totalAmount,
      status: s.status,
      paymentStatus: s.paymentStatus,
    })),
    ...purchases.map((p) => ({
      type: 'purchase',
      id: p._id,
      reference: p.purchaseNumber,
      party: p.supplier?.name || '—',
      date: p.createdAt,
      amount: p.totalAmount,
      status: p.status,
      paymentStatus: p.paymentStatus,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
};

// Out-of-stock products first, then low-stock from the lowest quantity up.
const loadLowStock = async () => {
  const [out, low] = await Promise.all([
    getProducts({ status: 'Out of Stock', limit: 8 }),
    getProducts({ status: 'Low Stock', limit: 50 }),
  ]);
  const ordered = [...out.products, ...[...low.products].sort((a, b) => a.quantity - b.quantity)];
  return { products: ordered.slice(0, 8), total: (out.total ?? out.products.length) + (low.total ?? low.products.length) };
};

// Compares the last 7 days of sales with the 7 days before, using the same
// UTC calendar days the backend groups by. Returns null when there's no
// data to compare so the UI never invents a percentage.
function weekOverWeek(daily) {
  if (!daily) return null;
  const now = new Date();
  const dayKey = (offset) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset)).toISOString().slice(0, 10);
  const thisWeek = new Set(Array.from({ length: 7 }, (_, i) => dayKey(i)));
  const lastWeek = new Set(Array.from({ length: 7 }, (_, i) => dayKey(i + 7)));
  let current = 0;
  let previous = 0;
  daily.forEach((d) => {
    if (thisWeek.has(d.date)) current += d.total;
    else if (lastWeek.has(d.date)) previous += d.total;
  });
  return { current, previous };
}

function salesSubline(daily) {
  const w = weekOverWeek(daily);
  if (!w) return null;
  if (w.current === 0 && w.previous === 0) return 'No sales in the last 14 days';
  if (w.previous === 0) return `${formatCurrency(w.current)} in last 7 days`;
  const change = ((w.current - w.previous) / w.previous) * 100;
  if (Math.abs(change) < 0.05) return `${formatCurrency(w.current)} last 7 days, unchanged`;
  const up = change > 0;
  return (
    <>
      {formatCurrency(w.current)} last 7 days,{' '}
      <span className={up ? 'kpi-delta-up' : 'kpi-delta-down'}>
        {up ? '+' : '−'}
        {Math.abs(change).toFixed(1)}%
      </span>{' '}
      vs previous 7
    </>
  );
}

function Dashboard() {
  const { isAdmin, isManager, isStaff } = useAuth();
  const enabled = !isStaff; // Staff are handed off to StaffDashboard below

  const summary = useLoad(loadSummary, enabled);
  const sales = useLoad(loadSalesAnalytics, enabled);
  const purchases = useLoad(loadPurchaseAnalytics, enabled);
  const transactions = useLoad(loadTransactions, enabled);
  const lowStock = useLoad(loadLowStock, enabled);

  if (isStaff) {
    return <StaffDashboard />;
  }

  const s = summary.data;
  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const businessItems = [
    {
      key: 'sales',
      label: 'Total sales',
      icon: IndianRupee,
      to: '/sales',
      loading: sales.loading,
      error: !!sales.error,
      value: sales.data && formatCurrency(sales.data.totalRevenue),
      sub: sales.data && salesSubline(sales.data.daily),
    },
    {
      key: 'purchases',
      label: 'Total purchases',
      icon: ShoppingBag,
      to: '/purchases',
      loading: purchases.loading,
      error: !!purchases.error,
      value: purchases.data && formatCurrency(purchases.data.totalValue),
      sub: 'Received orders only',
    },
    {
      key: 'stockValue',
      label: 'Total stock value',
      icon: Wallet,
      to: '/admin/reports',
      loading: summary.loading,
      error: !!summary.error,
      value: s && formatCurrency(s.totalStockValue),
      sub: s && `Across ${s.totalProducts} products`,
    },
  ];

  const inventoryItems = [
    {
      key: 'products',
      label: 'Total products',
      icon: Package,
      to: '/products',
      loading: summary.loading,
      error: !!summary.error,
      value: s?.totalProducts,
      sub: s && `${s.stockStatusBreakdown.inStock} in stock`,
    },
    {
      key: 'lowStock',
      label: 'Low stock items',
      icon: TriangleAlert,
      to: '/alerts',
      loading: summary.loading,
      error: !!summary.error,
      value: s?.stockStatusBreakdown.lowStock,
      tone: s?.stockStatusBreakdown.lowStock > 0 ? 'warning' : undefined,
      sub: 'At or below reorder level',
    },
    {
      key: 'outOfStock',
      label: 'Out of stock items',
      icon: PackageX,
      to: '/alerts',
      loading: summary.loading,
      error: !!summary.error,
      value: s?.stockStatusBreakdown.outOfStock,
      tone: s?.stockStatusBreakdown.outOfStock > 0 ? 'danger' : undefined,
      sub: 'Zero quantity',
    },
    {
      key: 'alerts',
      label: 'Active alerts',
      icon: CircleAlert,
      to: '/alerts',
      loading: summary.loading,
      error: !!summary.error,
      value: s?.activeAlertsCount,
      tone: s?.activeAlertsCount > 0 ? 'warning' : undefined,
      sub: 'Not yet resolved',
    },
    {
      key: 'suppliers',
      label: 'Suppliers',
      icon: Truck,
      to: '/suppliers',
      loading: summary.loading,
      error: !!summary.error,
      value: s?.totalSuppliers,
    },
    {
      key: 'categories',
      label: 'Categories',
      icon: Tags,
      to: '/categories',
      loading: summary.loading,
      error: !!summary.error,
      value: s?.totalCategories,
    },
  ];

  // Manager leads with the money; Admin leads with inventory. Same numbers,
  // different order.
  const groups = isManager
    ? [
        <KpiGroup key="b" title="Business" columns={3} items={businessItems} />,
        <KpiGroup key="i" title="Inventory" columns={6} items={inventoryItems} />,
      ]
    : [
        <KpiGroup key="i" title="Inventory" columns={6} items={inventoryItems} />,
        <KpiGroup key="b" title="Business" columns={3} items={businessItems} />,
      ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Stock levels, sales and purchases at a glance.</p>
          <span className="page-meta">
            <CalendarDays {...ICON_SM} />
            {todayLabel}
          </span>
        </div>

        {/* Shortcuts to existing pages. The Add Product / New Purchase forms
            open on arrival (?new=1); both are Admin + Manager only, matching
            the permissions on those pages. */}
        <div className="page-actions">
          <Link to="/sales" className="btn-primary">
            <ShoppingCart {...ICON_SM} />
            New sale
          </Link>
          {(isAdmin || isManager) && (
            <Link to="/products?new=1" className="btn-secondary">
              <Plus {...ICON_SM} />
              Add product
            </Link>
          )}
          {(isAdmin || isManager) && (
            <Link to="/purchases?new=1" className="btn-secondary">
              <ShoppingBag {...ICON_SM} />
              New purchase
            </Link>
          )}
        </div>
      </div>

      {summary.error && !summary.loading && (
        <div className="panel" style={{ marginBottom: '1rem' }}>
          <PanelError message={summary.error} onRetry={summary.reload} />
        </div>
      )}

      {groups}

      <div className="dash-grid">
        <div className="dash-stack">
          <SalesOverviewChart
            daily={sales.data?.daily}
            loading={sales.loading}
            error={sales.error}
            onRetry={sales.reload}
          />
          <RecentTransactions
            rows={transactions.data || []}
            loading={transactions.loading}
            error={transactions.error}
            onRetry={transactions.reload}
            canCreateSale
          />
        </div>

        <div className="dash-stack">
          <LowStockTable
            products={lowStock.data?.products || []}
            totalCount={lowStock.data?.total || 0}
            loading={lowStock.loading}
            error={lowStock.error}
            onRetry={lowStock.reload}
          />
          <section className="panel" aria-label="Recent activity">
            <div className="panel-header">
              <h2 className="panel-title">Recent activity</h2>
              {isAdmin && (
                <Link to="/admin/activity-logs" className="panel-link">
                  View all
                </Link>
              )}
            </div>
            {s ? <RecentActivity activities={s.recentActivities} /> : summary.loading ? <PanelLoading rows={4} /> : null}
          </section>
        </div>
      </div>

      {s && <StockChart stockStatusBreakdown={s.stockStatusBreakdown} categoryBreakdown={s.categoryBreakdown} />}
    </div>
  );
}

export default Dashboard;
