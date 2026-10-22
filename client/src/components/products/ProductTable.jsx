// src/components/products/ProductTable.jsx
// Displays the product list with stock status badges and row actions.
// `isAdmin` controls whether the Delete button is shown (Staff can't delete).
//
// PHASE 6: added a photo thumbnail column and a "View" action (opens
// ProductDetailsModal via onView) so every role - including Staff, who
// can't edit as freely as Admin/Manager elsewhere in the app - has a
// clear way to see full product details, per the Phase 5 Staff spec too.
//
// PHASE 19: added a Barcode column - `barcode` is a REAL field the
// backend already auto-generates and returns on every product (see
// models/Product.js / productController.js), it just wasn't shown in
// this table before. No new data, purely surfacing what's already there.

// PHASE 25: `canManage` (Admin + Manager only, per PRODUCTS_CREATE/
// UPDATE/DELETE) now gates BOTH Edit and Delete - Edit was previously
// shown to every role even though the backend has always rejected Staff
// on PUT /products/:id; this makes the button match the real permission.

import { useState } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import { productGst, formatRate } from '../../utils/gst';
import { API_ORIGIN } from '../../api/axiosInstance';
import { MAX_PRICE, MAX_QUANTITY, checkStockChange } from '../../utils/productLimits';

const statusClass = {
  'In Stock': 'badge badge-green',
  'Low Stock': 'badge badge-yellow',
  'Out of Stock': 'badge badge-red',
};

function ProductTable({ products, canManage, onEdit, onDelete, onAdjustStock, onView }) {
  // Tracks which product row has its small stock-adjust input open
  const [adjustingId, setAdjustingId] = useState(null);
  const [amount, setAmount] = useState('');
  const [adjustError, setAdjustError] = useState('');

  const startAdjust = (productId) => {
    setAdjustingId(productId);
    setAmount('');
    setAdjustError('');
  };

  const stopAdjust = () => {
    setAdjustingId(null);
    setAmount('');
    setAdjustError('');
  };

  // LIMITS: checks the FINAL stock (e.g. 900 + 200 = 1100 is refused here
  // before any request is sent; the server enforces the same rule again).
  const submitAdjust = (product, direction) => {
    const check = checkStockChange(product.quantity, direction, amount);
    if (!check.ok) {
      setAdjustError(check.message);
      return;
    }
    onAdjustStock(product._id, direction, check.value);
    stopAdjust();
  };

  if (products.length === 0) {
    return <p className="empty-state">No products found. Try adjusting your filters or add a new product.</p>;
  }

  return (
    <div className="products-table-wrap">
    <table className="data-table products-table">
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>SKU</th>
          <th>Barcode</th>
          <th>Category</th>
          <th>Supplier</th>
          <th className="col-numeric">Quantity</th>
          <th className="col-numeric">MRP (incl. GST)</th>
          <th>GST included</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr
            key={p._id}
          >
            <td>
              <div className="table-thumb">
                {p.image ? (
                  <img src={`${API_ORIGIN}${p.image}`} alt={p.name} />
                ) : (
                  <span className="table-thumb-placeholder">{p.name?.[0] || '?'}</span>
                )}
              </div>
            </td>
            <td className="cell-name" title={p.name}>{p.name}</td>
            <td className="cell-mono cell-nowrap">{p.sku}</td>
            <td className="cell-mono cell-nowrap">{p.barcode || '-'}</td>
            <td className="cell-nowrap">{p.category?.name || '-'}</td>
            <td className="cell-nowrap">{p.supplier?.name || '-'}</td>
            <td
              className={`cell-numeric${p.quantity > MAX_QUANTITY ? ' cell-over-limit' : ''}`}
              title={p.quantity > MAX_QUANTITY ? `Stock is above the ${MAX_QUANTITY}-unit limit. Edit the product to correct it.` : undefined}
            >
              {p.quantity}
            </td>
            {/* LIMITS: an old product saved before the ₹1,00,00,000 cap is
                flagged instead of showing an unrealistic amount. Its stored
                value is NOT changed - open Edit Product to correct it. */}
            <td className="cell-numeric cell-nowrap">
              {Number(p.price) > MAX_PRICE ? (
                <span className="cell-over-limit" title="This price is above ₹1,00,00,000. Edit the product to correct it.">
                  Over limit
                </span>
              ) : (
                formatCurrency(p.price)
              )}
            </td>
            <td>
              {Number(p.price) > MAX_PRICE ? (
                <span className="cell-sub">-</span>
              ) : Number(p.sgstRate) + Number(p.cgstRate) + Number(p.igstRate) > 0 ? (
                <>
                  <span className="gst-rates">
                    {[
                      p.sgstRate > 0 && `SGST ${formatRate(p.sgstRate)}`,
                      p.cgstRate > 0 && `CGST ${formatRate(p.cgstRate)}`,
                      p.igstRate > 0 && `IGST ${formatRate(p.igstRate)}`,
                    ]
                      .filter(Boolean)
                      .join(' + ')}
                  </span>
                  <span className="cell-sub">{formatCurrency(productGst(p).gstIncluded)} included in the MRP</span>
                </>
              ) : (
                <span className="cell-sub">No GST</span>
              )}
            </td>
            <td>
              <span className={statusClass[p.status] || 'badge'}>{p.status}</span>
            </td>
            <td className="actions-cell">
              <div className="row-actions">
                {adjustingId === p._id ? (
                  <span className="stock-adjust">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={MAX_QUANTITY}
                      step="1"
                      value={amount}
                      className={adjustError ? 'input-invalid' : undefined}
                      aria-invalid={adjustError ? 'true' : undefined}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setAdjustError('');
                      }}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
                      }}
                      placeholder="Amount"
                      autoFocus
                    />
                    <button type="button" title="Add to stock" onClick={() => submitAdjust(p, 'increase')}>+</button>
                    <button type="button" title="Remove from stock" onClick={() => submitAdjust(p, 'decrease')}>-</button>
                    <button type="button" title="Cancel" onClick={stopAdjust}>x</button>
                  </span>
                ) : (
                  <button className="btn-link" onClick={() => startAdjust(p._id)}>
                    Adjust Stock
                  </button>
                )}
                <button className="btn-link" onClick={() => onView(p)}>
                  View
                </button>
                {canManage && (
                  <button className="btn-link" onClick={() => onEdit(p)}>
                    Edit
                  </button>
                )}
                {canManage && (
                  <button className="btn-link btn-link-danger" onClick={() => onDelete(p)}>
                    Delete
                  </button>
                )}
              </div>
              {adjustingId === p._id && adjustError && (
                <span className="field-error stock-adjust-error" role="alert">{adjustError}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

export default ProductTable;

