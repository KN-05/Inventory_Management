// src/components/sales/SalesHistoryTable.jsx

import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/formatCurrency';

const statusClass = {
  completed: 'badge badge-green',
  cancelled: 'badge badge-red',
};

const paymentClass = {
  paid: 'badge badge-green',
  pending: 'badge badge-yellow',
};

function SalesHistoryTable({ sales, canCancel, onView, onCancel }) {
  if (sales.length === 0) {
    return <p className="empty-state">No sales recorded yet.</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Invoice #</th>
          <th>Customer</th>
          <th className="col-numeric">Total</th>
          <th>Payment</th>
          <th>Status</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sales.map((s, index) => (
          <motion.tr
            key={s._id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 8) * 0.03 }}
          >
            <td className="cell-mono">{s.invoiceNumber}</td>
            <td>{s.customer?.name || 'Walk-in'}</td>
            <td className="cell-numeric">{formatCurrency(s.totalAmount)}</td>
            <td>
              <span className={paymentClass[s.paymentStatus] || 'badge'}>{s.paymentStatus}</span>
            </td>
            <td>
              <span className={statusClass[s.status] || 'badge'}>{s.status}</span>
            </td>
            <td>{new Date(s.createdAt).toLocaleDateString()}</td>
            <td className="actions-cell">
              <button className="btn-link" onClick={() => onView(s)}>
                View Invoice
              </button>
              {canCancel && s.status === 'completed' && (
                <button className="btn-link btn-link-danger" onClick={() => onCancel(s)}>
                  Cancel
                </button>
              )}
            </td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  );
}

export default SalesHistoryTable;
