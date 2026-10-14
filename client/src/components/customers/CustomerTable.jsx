// src/components/customers/CustomerTable.jsx
//
// PHASE 21: added a small initials avatar before each customer's name -
// purely visual (same pattern as the Sidebar/Navbar avatars), no new data.

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
        {customers.map((c) => (
          <tr
            key={c._id}
          >
            <td>
              <span className="cell-with-avatar">
                <span className="table-avatar">{c.name?.[0]?.toUpperCase() || '?'}</span>
                {c.name}
              </span>
            </td>
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default CustomerTable;

