// src/components/categories/CategoryTable.jsx
// Animation (Phase 1 revision): row entrance staggered with Framer Motion.
// `canManage` gates both Edit and Delete - Staff has view-only access per
// the permission map (PHASE 4 fix, Edit was previously shown to everyone).

import { motion } from 'framer-motion';
import { API_ORIGIN } from '../../api/axiosInstance';

function CategoryTable({ categories, canManage, onEdit, onDelete }) {
  if (categories.length === 0) {
    return <p className="empty-state">No categories yet. Add your first category to get started.</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Description</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {categories.map((c, index) => (
          <motion.tr
            key={c._id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 8) * 0.03 }}
          >
            <td>
              <div className="table-thumb">
                {c.image ? (
                  <img src={`${API_ORIGIN}${c.image}`} alt={c.name} />
                ) : (
                  <span className="table-thumb-placeholder">{c.name?.[0] || '?'}</span>
                )}
              </div>
            </td>
            <td>{c.name}</td>
            <td>{c.description || '-'}</td>
            <td>
              <span className={c.status === 'inactive' ? 'badge badge-red' : 'badge badge-green'}>
                {c.status === 'inactive' ? 'Inactive' : 'Active'}
              </span>
            </td>
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

export default CategoryTable;
