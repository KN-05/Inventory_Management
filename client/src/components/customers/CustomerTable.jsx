// src/components/customers/CustomerTable.jsx

import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/formatCurrency';

function CustomerTable({ customers, canManage, onEdit, onDelete }) {
  if (customers.length === 0) {
    return <p className="empty-state">No customers yet. Add your first customer to get started.</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Email</th>
          <th>City</th>
          <th className="col-numeric">Total Purchases</th>
          <th>Last Purchase</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((c, index) => (
          <motion.tr
            key={c._id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 8) * 0.03 }}
          >
            <td>{c.name}</td>
            <td>{c.phone || '-'}</td>
            <td>{c.email || '-'}</td>
            <td>{c.city || '-'}</td>
            <td className="cell-numeric">{formatCurrency(c.totalPurchases)}</td>
            <td>{c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString() : '-'}</td>
            <td className="actions-cell">
              {canManage ? (
                <>
                  <button className="btn-link" onClick={() => onEdit(c)}>
                    Edit
                  </button>
                  <button className="btn-link btn-link-danger" onClick={() => onDelete(c)}>
                    Delete
                  </button>
                </>
              ) : (
                <span className="page-subtitle">View only</span>
              )}
            </td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  );
}

export default CustomerTable;
