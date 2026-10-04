// src/pages/admin/ActivityLogs.jsx
// PHASE 3: Admin's full activity log view - paginated, filterable by
// module. Unlike the Dashboard's "Recent Activity" (last 10 only), this
// shows the complete history.
//
// PHASE 9: redesigned from a plain data-table into a timeline/activity
// feed - matching the brief's "Each activity should have: Icon,
// Description, User, Time" format, and reusing the exact same
// .activity-list/.activity-icon/.activity-time visual language (and
// module-icon mapping) as the Dashboard's RecentActivity widget, so the
// two feel like the same feature at different zoom levels rather than
// two different designs. Filtering/pagination logic is untouched - only
// how each row is rendered changed.

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getActivityLogs } from '../../api/activityLogs';
import { roleLabel } from '../../utils/roleLabel';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';

// PHASE 11 FIX: this list was missing 'purchase', 'sale', and 'customer' -
// those log entries have existed in the database since Phases 7/8 (the
// backend's ActivityLog module enum already includes them), but Admin
// had no way to filter down to just them here. Kept in sync with
// server/models/ActivityLog.js's enum.
const MODULES = ['product', 'supplier', 'category', 'stock', 'purchase', 'sale', 'customer', 'user', 'auth', 'other'];

// Same icon-per-module mapping as components/dashboard/RecentActivity.jsx,
// kept in sync by hand since it's a tiny const map, not worth importing
// across an admin-page/dashboard-widget boundary for.
const MODULE_ICONS = {
  product: '📦',
  category: '🗂️',
  supplier: '🚚',
  purchase: '🧾',
  sale: '💰',
  customer: '🙍',
  stock: '📉',
  user: '👤',
  auth: '🔐',
};

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

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
      <PageHeader title="Activity Logs" subtitle="Full history of actions taken across the app" />

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
        <Card>
          <ul className="activity-list">
            {logs.map((log, index) => (
              <motion.li
                key={log._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 12) * 0.02 }}
              >
                <span className="activity-text">
                  <span className="activity-icon" aria-hidden="true">
                    {MODULE_ICONS[log.module] || '•'}
                  </span>
                  <strong>{log.user?.name || 'Unknown user'}</strong>
                  {log.user && (
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                      {' '}
                      ({roleLabel(log.user.role)})
                    </span>
                  )}{' '}
                  {log.action}
                </span>
                <span className="activity-time">{timeAgo(log.createdAt)}</span>
              </motion.li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="pagination-bar">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="page-subtitle">
                Page {page} of {totalPages}
              </span>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default ActivityLogs;
