// src/pages/admin/ActivityLogs.jsx
// PHASE 3: Admin's full activity log view - paginated, filterable by
// module. Unlike the Dashboard's "Recent Activity" (last 10 only), this
// shows the complete history.

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getActivityLogs } from '../../api/activityLogs';
import { roleLabel } from '../../utils/roleLabel';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';

const MODULES = ['product', 'supplier', 'category', 'stock', 'user', 'auth', 'other'];

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getActivityLogs({
        module: moduleFilter || undefined,
        page,
        limit: 20,
      });
      setLogs(data.logs);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Activity Logs</h1>
      </div>

      {error && <p className="banner banner-error">{error}</p>}

      <div className="filters-bar">
        <select
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Modules</option>
          {MODULES.map((m) => (
            <option key={m} value={m}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader label="Loading activity logs..." />
      ) : logs.length === 0 ? (
        <p className="empty-state">No activity recorded yet.</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Module</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <motion.tr
                  key={log._id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                    delay: Math.min(index, 10) * 0.02,
                  }}
                >
                  <td>{log.user?.name || 'Unknown user'}</td>
                  <td>{log.user ? roleLabel(log.user.role) : '-'}</td>
                  <td>{log.action}</td>
                  <td>
                    <span className="badge">{log.module}</span>
                  </td>
                  <td className="cell-mono">{new Date(log.createdAt).toLocaleString()}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination-bar">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="page-subtitle">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ActivityLogs;
