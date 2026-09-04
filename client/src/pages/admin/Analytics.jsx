// src/pages/admin/Analytics.jsx
// PHASE 10: Sales / Purchase / Profit analytics. Separate from
// pages/admin/Reports.jsx (which already covers Inventory Analytics -
// stock value, category/supplier breakdown - built in earlier phases),
// matching the spec's sidebar having both "Reports" and "Analytics" as
// distinct items. Admin + Manager only, per ANALYTICS_VIEW.

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { getSalesAnalytics, getPurchaseAnalytics, getProfitAnalytics } from '../../api/admin';
import { formatCurrency } from '../../utils/formatCurrency';
import Loader from '../../components/common/Loader';

function Analytics() {
  const [sales, setSales] = useState(null);
  const [purchases, setPurchases] = useState(null);
  const [profit, setProfit] = useState(null);
  const [error, setError] = useState('');
  const [salesGranularity, setSalesGranularity] = useState('monthly'); // daily | weekly | monthly

  useEffect(() => {
    Promise.all([getSalesAnalytics(), getPurchaseAnalytics(), getProfitAnalytics()])
      .then(([s, p, pr]) => {
        setSales(s);
        setPurchases(p);
        setProfit(pr);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load analytics'));
  }, []);

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Analytics</h1>
        </div>
        <p className="banner banner-error">{error}</p>
      </div>
    );
  }

  if (!sales || !purchases || !profit) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Analytics</h1>
        </div>
        <Loader label="Loading analytics..." />
      </div>
    );
  }

  const salesTrendKey = { daily: 'date', weekly: 'week', monthly: 'month' }[salesGranularity];
  const salesTrendData = sales[salesGranularity];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Analytics</h1>
      </div>

      {/* --- Sales Analytics --- */}
      <div className="chart-card" style={{ marginBottom: '1rem' }}>
        <h3>Sales Analytics</h3>
        <div className="stats-grid" style={{ marginBottom: '1rem' }}>
          <div className="stat-card">
            <p className="stat-card-label">Total Orders</p>
            <p className="stat-card-value">{sales.totalOrders}</p>
          </div>
          <div className="stat-card stat-card-success">
            <p className="stat-card-label">Total Revenue</p>
            <p className="stat-card-value">{formatCurrency(sales.totalRevenue)}</p>
          </div>
        </div>

        <div className="filters-bar" style={{ marginBottom: '0.5rem' }}>
          {['daily', 'weekly', 'monthly'].map((g) => (
            <button
              key={g}
              className={salesGranularity === g ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setSalesGranularity(g)}
              type="button"
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        {salesTrendData.length === 0 ? (
          <p className="empty-state">No completed sales yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={salesTrendKey} tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="total" name="Revenue" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}

        <h4 style={{ marginTop: '1rem' }}>Top-Selling Products</h4>
        {sales.topProducts.length === 0 ? (
          <p className="empty-state">No sales recorded yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th className="col-numeric">Quantity Sold</th>
                <th className="col-numeric">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sales.topProducts.map((p, i) => (
                <tr key={i}>
                  <td>{p.name}</td>
                  <td className="cell-mono">{p.sku}</td>
                  <td className="cell-numeric">{p.quantitySold}</td>
                  <td className="cell-numeric">{formatCurrency(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- Purchase Analytics --- */}
      <div className="chart-card" style={{ marginBottom: '1rem' }}>
        <h3>Purchase Analytics</h3>
        <div className="stats-grid" style={{ marginBottom: '1rem' }}>
          <div className="stat-card">
            <p className="stat-card-label">Received Purchase Orders</p>
            <p className="stat-card-value">{purchases.totalPurchases}</p>
          </div>
          <div className="stat-card stat-card-warning">
            <p className="stat-card-label">Total Purchase Value</p>
            <p className="stat-card-value">{formatCurrency(purchases.totalValue)}</p>
          </div>
        </div>

        {purchases.monthly.length === 0 ? (
          <p className="empty-state">No received purchases yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={purchases.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="total" name="Purchase Value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        <h4 style={{ marginTop: '1rem' }}>Supplier-wise Purchases</h4>
        {purchases.supplierWise.length === 0 ? (
          <p className="empty-state">No received purchases yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th className="col-numeric">Orders</th>
                <th className="col-numeric">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {purchases.supplierWise.map((s, i) => (
                <tr key={i}>
                  <td>{s.supplier}</td>
                  <td className="cell-numeric">{s.count}</td>
                  <td className="cell-numeric">{formatCurrency(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- Profit Analytics --- */}
      <div className="chart-card">
        <h3>Profit Analytics</h3>
        {profit.note && <p className="banner banner-warning">{profit.note}</p>}

        <div className="stats-grid" style={{ marginBottom: '1rem' }}>
          <div className="stat-card">
            <p className="stat-card-label">Total Revenue</p>
            <p className="stat-card-value">{formatCurrency(profit.totals.totalRevenue)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">Total Cost</p>
            <p className="stat-card-value">{formatCurrency(profit.totals.totalCost)}</p>
          </div>
          <div className="stat-card stat-card-success">
            <p className="stat-card-label">Total Profit</p>
            <p className="stat-card-value">{formatCurrency(profit.totals.totalProfit)}</p>
          </div>
        </div>

        {profit.monthly.length > 0 && (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={profit.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#4f46e5" strokeWidth={2} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#12b76a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}

        <div className="charts-grid" style={{ marginTop: '1rem' }}>
          <div>
            <h4>Product-wise Profit</h4>
            {profit.productWise.length === 0 ? (
              <p className="empty-state">No completed sales yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="col-numeric">Revenue</th>
                    <th className="col-numeric">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {profit.productWise.slice(0, 10).map((p, i) => (
                    <tr key={i}>
                      <td>{p.name}</td>
                      <td className="cell-numeric">{formatCurrency(p.revenue)}</td>
                      <td className="cell-numeric">{formatCurrency(p.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <h4>Category-wise Profit</h4>
            {profit.categoryWise.length === 0 ? (
              <p className="empty-state">No completed sales yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="col-numeric">Revenue</th>
                    <th className="col-numeric">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {profit.categoryWise.map((c, i) => (
                    <tr key={i}>
                      <td>{c.category}</td>
                      <td className="cell-numeric">{formatCurrency(c.revenue)}</td>
                      <td className="cell-numeric">{formatCurrency(c.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
