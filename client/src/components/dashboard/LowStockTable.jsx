// src/components/dashboard/LowStockTable.jsx
// Products that need attention now - out of stock first, then low stock
// from the lowest quantity up. Quantity is coloured (red = none left,
// amber = at or below its reorder threshold) so the worst rows stand out.
// "View" opens the Products page filtered to that SKU (the existing
// ?search= behaviour).

import { Link } from 'react-router-dom';
import { PanelLoading, PanelError, PanelEmpty } from './PanelState';

function LowStockTable({ products, totalCount, loading, error, onRetry }) {
  return (
    <section className="panel" aria-label="Low stock products">
      <div className="panel-header">
        <h2 className="panel-title">Low stock products</h2>
        <Link to="/alerts" className="panel-link">
          View all alerts
        </Link>
      </div>

      {loading ? (
        <PanelLoading rows={4} />
      ) : error ? (
        <PanelError message={error} onRetry={onRetry} />
      ) : products.length === 0 ? (
        <PanelEmpty title="Stock levels look healthy">No product is at or below its reorder threshold.</PanelEmpty>
      ) : (
        <>
          <div className="panel-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="col-numeric">Qty</th>
                  <th className="col-numeric">Reorder at</th>
                  <th>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {p.name}
                      <span className="cell-sub cell-mono">{p.sku}</span>
                    </td>
                    <td className={`cell-numeric ${p.quantity <= 0 ? 'qty-danger' : 'qty-warning'}`}>{p.quantity}</td>
                    <td className="cell-numeric">{p.lowStockThreshold}</td>
                    <td>
                      <Link to={`/products?search=${encodeURIComponent(p.sku)}`} className="panel-link">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalCount > products.length && (
            <p className="panel-note" style={{ padding: '0.6rem 1rem', margin: 0 }}>
              Showing {products.length} of {totalCount} products that need attention.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default LowStockTable;
