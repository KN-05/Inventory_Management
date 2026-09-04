// src/pages/Purchases.jsx
// PHASE 7: Purchase Order management. Admin + Manager only (route-gated
// in App.jsx and link-gated in Sidebar.jsx) - Staff has no PURCHASES_*
// permission at all, per the spec's Staff "Allowed" list.

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getSupplierOptions, getProductOptions } from '../api/lookups';
import {
  getPurchases,
  createPurchase,
  updatePurchase,
  updatePurchasePaymentStatus,
  receivePurchase,
  deletePurchase,
  exportPurchasesCsv,
} from '../api/purchases';
import { downloadBlob } from '../utils/downloadBlob';

import PurchaseTable from '../components/purchases/PurchaseTable';
import PurchaseForm from '../components/purchases/PurchaseForm';
import PurchaseDetailsModal from '../components/purchases/PurchaseDetailsModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';

function Purchases() {
  const { isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager; // both roles have full purchase permissions
  const toast = useToast();

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState(''); // doubles as "supplier purchase history"
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [formError, setFormError] = useState('');
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadLookups = useCallback(async () => {
    const [sups, prods] = await Promise.all([getSupplierOptions(), getProductOptions()]);
    setSuppliers(sups);
    setProducts(prods);
  }, []);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getPurchases({
        search: search || undefined,
        supplier: supplierFilter || undefined,
        status: statusFilter || undefined,
      });
      setPurchases(data.purchases);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [search, supplierFilter, statusFilter]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const openAddForm = () => {
    setEditingPurchase(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (purchase) => {
    setEditingPurchase(purchase);
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async (data) => {
    setFormError('');
    try {
      if (editingPurchase) {
        await updatePurchase(editingPurchase._id, data);
        toast.success('Purchase order updated');
      } else {
        await createPurchase(data);
        toast.success('Purchase order created');
      }
      setFormOpen(false);
      loadPurchases();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  const handlePaymentStatusChange = async (purchase, paymentStatus) => {
    try {
      await updatePurchasePaymentStatus(purchase._id, paymentStatus);
      toast.success('Payment status updated');
      loadPurchases();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payment status');
    }
  };

  const confirmReceive = async () => {
    try {
      await receivePurchase(receiveTarget._id);
      toast.success(`"${receiveTarget.purchaseNumber}" received - stock updated`);
      setReceiveTarget(null);
      loadPurchases();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to receive purchase');
      setReceiveTarget(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await deletePurchase(deleteTarget._id);
      toast.success(`"${deleteTarget.purchaseNumber}" deleted`);
      setDeleteTarget(null);
      loadPurchases();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete purchase order');
      setDeleteTarget(null);
    }
  };

  // PHASE 9: gated to Admin/Manager here in the UI, though the backend's
  // own PURCHASES_VIEW check is the real enforcement (Staff has no
  // PURCHASES_VIEW at all, so they can't reach this page in the first place).
  const handleExport = async () => {
    try {
      const blob = await exportPurchasesCsv();
      downloadBlob(blob, 'purchases-export.csv');
    } catch (err) {
      toast.error('Failed to export purchases: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Purchases</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
          {canManage && (
            <Button variant="primary" onClick={openAddForm}>
              + New Purchase Order
            </Button>
          )}
        </div>
      </div>

      {loadError && <p className="banner banner-error">{loadError}</p>}

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search by PO number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="filters-search"
        />
        <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
          <option value="">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <Loader label="Loading purchase orders..." />
      ) : (
        <PurchaseTable
          purchases={purchases}
          canManage={canManage}
          isAdmin={isAdmin}
          onView={setViewingPurchase}
          onEdit={openEditForm}
          onReceive={setReceiveTarget}
          onDelete={setDeleteTarget}
          onPaymentStatusChange={handlePaymentStatusChange}
        />
      )}

      <PurchaseForm
        open={formOpen}
        purchase={editingPurchase}
        suppliers={suppliers}
        products={products}
        onSubmit={handleFormSubmit}
        onCancel={() => setFormOpen(false)}
        error={formError}
      />

      <PurchaseDetailsModal
        open={!!viewingPurchase}
        purchase={viewingPurchase}
        onClose={() => setViewingPurchase(null)}
      />

      <ConfirmDialog
        open={!!receiveTarget}
        title="Receive purchase order?"
        message={
          receiveTarget
            ? `This will increase stock for every product in "${receiveTarget.purchaseNumber}" and cannot be undone.`
            : ''
        }
        confirmLabel="Receive"
        onConfirm={confirmReceive}
        onCancel={() => setReceiveTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete purchase order?"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.purchaseNumber}"?` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default Purchases;
