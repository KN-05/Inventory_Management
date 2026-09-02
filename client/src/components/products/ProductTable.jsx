// src/components/products/ProductTable.jsx
// Displays the product list with stock status badges and row actions.
// `isAdmin` controls whether the Delete button is shown (Staff can't delete).
// Animation (Phase 1 revision): row entrance is staggered with Framer
// Motion (motion.tr) instead of CSS @keyframes/animation-delay.
//
// PHASE 6: added a photo thumbnail column and a "View" action (opens
// ProductDetailsModal via onView) so every role - including Staff, who
// can't edit as freely as Admin/Manager elsewhere in the app - has a
// clear way to see full product details, per the Phase 5 Staff spec too.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/formatCurrency';
import { API_ORIGIN } from '../../api/axiosInstance';

const statusClass = {
  'In Stock': 'badge badge-green',
  'Low Stock': 'badge badge-yellow',
  'Out of Stock': 'badge badge-red',
};

function ProductTable({ products, isAdmin, onEdit, onDelete, onAdjustStock, onView }) {
  // Tracks which product row has its small stock-adjust input open
  const [adjustingId, setAdjustingId] = useState(null);
  const [amount, setAmount] = useState('');

  const startAdjust = (productId) => {
    setAdjustingId(productId);
    setAmount('');
  };

  const submitAdjust = (productId, direction) => {
    const value = Number(amount);
    if (!value || value <= 0) return;
    onAdjustStock(productId, direction, value);
    setAdjustingId(null);
    setAmount('');
  };

  if (products.length === 0) {
    return <p className="empty-state">No products found. Try adjusting your filters or add a new product.</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>SKU</th>
          <th>Category</th>
          <th>Supplier</th>
          <th className="col-numeric">Quantity</th>
          <th className="col-numeric">Price</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p, index) => (
          <motion.tr
            key={p._id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 8) * 0.03 }}
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
            <td>{p.name}</td>
            <td className="cell-mono">{p.sku}</td>
            <td>{p.category?.name || '-'}</td>
            <td>{p.supplier?.name || '-'}</td>
            <td className="cell-numeric">{p.quantity}</td>
            <td className="cell-numeric">{formatCurrency(p.price)}</td>
            <td>
              <span className={statusClass[p.status] || 'badge'}>{p.status}</span>
            </td>
            <td className="actions-cell">
              {adjustingId === p._id ? (
                <span className="stock-adjust">
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    autoFocus
                  />
                  <button onClick={() => submitAdjust(p._id, 'increase')}>+</button>
                  <button onClick={() => submitAdjust(p._id, 'decrease')}>-</button>
                  <button onClick={() => setAdjustingId(null)}>x</button>
                </span>
              ) : (
                <button className="btn-link" onClick={() => startAdjust(p._id)}>
                  Adjust Stock
                </button>
              )}
              <button className="btn-link" onClick={() => onView(p)}>
                View
              </button>
              <button className="btn-link" onClick={() => onEdit(p)}>
                Edit
              </button>
              {isAdmin && (
                <button className="btn-link btn-link-danger" onClick={() => onDelete(p)}>
                  Delete
                </button>
              )}
            </td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  );
}

export default ProductTable;
