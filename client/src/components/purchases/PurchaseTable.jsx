// src/components/purchases/PurchaseTable.jsx
// PHASE 7: lists purchase orders. Actions available per row depend on
// status: a 'pending' purchase can be edited/received/deleted; a
// 'received' one is a permanent record - only its payment status can
// still change.

import { formatCurrency } from '../../utils/formatCurrency';

const statusClass = {
  pending: 'badge badge-yellow',
  received: 'badge badge-green',
  cancelled: 'badge badge-red',
};

const paymentClass = {
  unpaid: 'badge badge-red',
  partial: 'badge badge-yellow',
  paid: 'badge badge-green',
};

function PurchaseTable({ purchases, canManage, isAdmin, onView, onEdit, onReceive, onDelete, onPaymentStatusChange }) {
  if (purchases.length === 0) {
    return <p className="empty-state">No purchase orders yet. Create one to record stock coming in.</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>PO Number</th>
          <th>Supplier</th>
          <th className="col-numeric">Total</th>
          <th>Payment</th>
          <th>Status</th>
          <th>Date</th>
          <th>Received</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {purchases.map((p) => (
          <tr
            key={p._id}
          >
            <td className="cell-mono">{p.purchaseNumber}</td>
            <td>{p.supplier?.name || '-'}</td>
            <td className="cell-numeric">{formatCurrency(p.totalAmount)}</td>
            <td>
              {canManage ? (
                <select
                  value={p.paymentStatus}
                  onChange={(e) => onPaymentStatusChange(p, e.target.value)}
                  className={paymentClass[p.paymentStatus] || 'badge'}
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              ) : (
                <span className={paymentClass[p.paymentStatus] || 'badge'}>{p.paymentStatus}</span>
              )}
            </td>
            <td>
              <span className={statusClass[p.status] || 'badge'}>{p.status}</span>
            </td>
            <td>{new Date(p.createdAt).toLocaleDateString()}</td>
            <td>{p.receivedDate ? new Date(p.receivedDate).toLocaleDateString() : '-'}</td>
            <td className="actions-cell">
              <button className="btn-link" onClick={() => onView(p)}>
                View
              </button>
              {canManage && p.status === 'pending' && (
                <>
                  <button className="btn-link" onClick={() => onEdit(p)}>
                    Edit
                  </button>
                  <button className="btn-link" onClick={() => onReceive(p)}>
                    Receive
                  </button>
                </>
              )}
              {isAdmin && p.status === 'pending' && (
                <button className="btn-link btn-link-danger" onClick={() => onDelete(p)}>
                  Delete
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default PurchaseTable;
