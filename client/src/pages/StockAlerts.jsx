// src/pages/StockAlerts.jsx

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { getAlerts, resolveAlert } from '../api/alerts';
import AlertList from '../components/alerts/AlertList';
import Loader from '../components/common/Loader';

function StockAlerts() {
  const toast = useToast();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('active'); // 'active' | 'resolved' | '' (all)

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAlerts(filter || undefined);
      setAlerts(data.alerts);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleResolve = async (alert) => {
    try {
      await resolveAlert(alert._id);
      toast.success('Alert marked as resolved');
      loadAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve alert');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Stock Alerts</h1>
      </div>

      {loadError && <p className="banner banner-error">{loadError}</p>}

      <div className="filters-bar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
          <option value="">All</option>
        </select>
      </div>

      {loading ? (
        <Loader label="Loading alerts..." />
      ) : (
        <AlertList alerts={alerts} onResolve={handleResolve} />
      )}
    </div>
  );
}

export default StockAlerts;
