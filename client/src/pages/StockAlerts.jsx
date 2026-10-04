// src/pages/StockAlerts.jsx

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '../context/useToast';
import { getAlerts, resolveAlert } from '../api/alerts';
import AlertList from '../components/alerts/AlertList';
import Loader from '../components/common/Loader';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/dashboard/StatCard';

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

  // PHASE 9: summary counts for whatever's currently loaded (respects the
  // Active/Resolved/All filter above) - pure client-side derivation from
  // data already fetched, no extra API call.
  const summary = useMemo(() => {
    const lowStock = alerts.filter((a) => a.product?.status === 'Low Stock').length;
    const outOfStock = alerts.filter((a) => a.product?.status === 'Out of Stock').length;
    return { total: alerts.length, lowStock, outOfStock };
  }, [alerts]);

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
      <PageHeader title="Stock Alerts" subtitle="Products that need restocking attention" />

      {loadError && <p className="banner banner-error">{loadError}</p>}

      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard icon="🔔" label={`${filter || 'All'} Alerts`} value={summary.total} tone="default" index={0} />
        <StatCard icon="⚠️" label="Low Stock" value={summary.lowStock} tone="warning" index={1} />
        <StatCard icon="🚫" label="Out of Stock" value={summary.outOfStock} tone="danger" index={2} />
      </div>

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
