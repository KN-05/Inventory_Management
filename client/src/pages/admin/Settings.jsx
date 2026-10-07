// src/pages/admin/Settings.jsx
// PHASE 3: system-wide settings, Admin only per the spec's nav list.

import { useEffect, useState } from 'react';
import { useToast } from '../../context/useToast';
import { getSettings, updateSettings } from '../../api/settings';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';

function Settings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState(10);

  useEffect(() => {
    getSettings()
      .then((settings) => {
        setCompanyName(settings.companyName);
        setCurrency(settings.currency);
        setDefaultLowStockThreshold(settings.defaultLowStockThreshold);
      })
      .catch((err) => setLoadError(err.response?.data?.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateSettings({
        companyName,
        currency,
        defaultLowStockThreshold: Number(defaultLowStockThreshold),
      });
      toast.success('Settings updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Loader label="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="System-wide preferences for the whole organization" />

      {loadError && <p className="banner banner-error">{loadError}</p>}

      <Card title="General" style={{ maxWidth: 480 }}>
        {error && <p className="form-error">{error}</p>}

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>Company Name</label>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />

          <label>Currency Code</label>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} required />

          <label>Default Low Stock Threshold</label>
          <input
            type="number"
            min="0"
            value={defaultLowStockThreshold}
            onChange={(e) => setDefaultLowStockThreshold(e.target.value)}
            required
          />

          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default Settings;
