// src/components/suppliers/SupplierTable.jsx
// Animation (Phase 1 revision): row entrance staggered with Framer Motion.
// `canManage` gates both Edit and Delete - Staff has view-only access per
// the permission map (PHASE 4 fix, Edit was previously shown to everyone).


function SupplierTable({ suppliers, canManage, onEdit, onDelete }) {
  if (suppliers.length === 0) {
    return <p className="empty-state">No suppliers found. Try a different search or add a new supplier.</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Company</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Location</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {suppliers.map((s) => (
          <tr
            key={s._id}
          >
            <td>{s.name}</td>
            <td>{s.companyName || '-'}</td>
            <td>{s.email || '-'}</td>
            <td>{s.phone || '-'}</td>
            <td>{[s.city, s.country].filter(Boolean).join(', ') || '-'}</td>
            <td>
              <span className={s.status === 'inactive' ? 'badge badge-red' : 'badge badge-green'}>
                {s.status === 'inactive' ? 'Inactive' : 'Active'}
              </span>
            </td>
            <td className="actions-cell">
              {canManage ? (
                <>
                  <button className="btn-link" onClick={() => onEdit(s)}>
                    Edit
                  </button>
                  <button className="btn-link btn-link-danger" onClick={() => onDelete(s)}>
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

export default SupplierTable;
