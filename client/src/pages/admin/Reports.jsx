// src/pages/admin/Reports.jsx
// Admin-only: stock report (category breakdown + low/out-of-stock lists)
// and supplier-wise report (product count + stock value per supplier).

import { useEffect, useState } from 'react';
import { getStockReport, getSupplierReport } from '../../api/admin';
import { formatCurrency } from '../../utils/formatCurrency';
import Loader from '../../components/common/Loader';

function Reports() {
  const [stockReport, setStockReport] = useState(null);
  const [supplierReport, setSupplierReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getStockReport(), getSupplierReport()])
      .then(([stock, suppliers]) => {
        setStockReport(stock);
        setSupplierReport(suppliers);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load reports'));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reports</h1>
      </div>

      {error && <p className="banner banner-error">{error}</p>}

      {!stockReport || !supplierReport ? (
        <Loader label="Loading reports..." />
      ) : (
        <>
          {/* --- Stock Report --- */}
          <div className="chart-card" style={{ marginBottom: '1rem' }}>
            <h3>Stock Report</h3>
            <div className="stats-grid" style={{ marginBottom: '1rem' }}>
              <div className="stat-card">
                <p className="stat-card-label">Total Products</p>
                <p className="stat-card-value">{stockReport.totals.totalProducts}</p>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Total Quantity</p>
                <p className="stat-card-value">{stockReport.totals.totalQuantity}</p>
              </div>
              <div className="stat-card stat-card-success">
                <p className="stat-card-label">Total Stock Value</p>
                <p className="stat-card-value">{formatCurrency(stockReport.totals.totalValue)}</p>
              </div>
            </div>

            <h4>By Category</h4>
            <table className="data-table" style={{ marginBottom: '1rem' }}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="col-numeric">Products</th>
                  <th className="col-numeric">Quantity</th>
                  <th className="col-numeric">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {stockReport.categoryBreakdown.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td className="cell-numeric">{row.productCount}</td>
                    <td className="cell-numeric">{row.totalQuantity}</td>
                    <td className="cell-numeric">{formatCurrency(row.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4>Low Stock Products ({stockReport.lowStockProducts.length})</h4>
            {stockReport.lowStockProducts.length === 0 ? (
              <p className="empty-state">None right now.</p>
            ) : (
              <table className="data-table" style={{ marginBottom: '1rem' }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {stockReport.lowStockProducts.map((p) => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td className="cell-mono">{p.sku}</td>
                      <td>{p.category?.name || '-'}</td>
                      <td>{p.quantity}</td>
                      <td>{p.lowStockThreshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h4>Out of Stock Products ({stockReport.outOfStockProducts.length})</h4>
            {stockReport.outOfStockProducts.length === 0 ? (
              <p className="empty-state">None right now.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {stockReport.outOfStockProducts.map((p) => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td className="cell-mono">{p.sku}</td>
                      <td>{p.category?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* --- Supplier-wise Report --- */}
          <div className="chart-card">
            <h3>Supplier-wise Report</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Email</th>
                  <th className="col-numeric">Products</th>
                  <th className="col-numeric">Quantity</th>
                  <th className="col-numeric">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {supplierReport.map((row) => (
                  <tr key={row.supplier}>
                    <td>{row.supplier}</td>
                    <td>{row.email || '-'}</td>
                    <td className="cell-numeric">{row.productCount}</td>
                    <td className="cell-numeric">{row.totalQuantity}</td>
                    <td className="cell-numeric">{formatCurrency(row.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default Reports;
