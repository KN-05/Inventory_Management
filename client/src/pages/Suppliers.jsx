// src/pages/Suppliers.jsx

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../api/suppliers';

import SupplierTable from '../components/suppliers/SupplierTable';
import SupplierForm from '../components/suppliers/SupplierForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';

function Suppliers() {
  const { isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager; // create/edit/delete - Staff has view-only per the permission map
  const toast = useToast();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getSuppliers({ search: search || undefined });
      setSuppliers(data.suppliers);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const openAddForm = () => {
    setEditingSupplier(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (supplier) => {
    setEditingSupplier(supplier);
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    setFormError('');
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier._id, formData);
        toast.success('Supplier updated successfully');
      } else {
        await createSupplier(formData);
        toast.success('Supplier added successfully');
      }
      setFormOpen(false);
      loadSuppliers();
    } catch (err) {
      const data = err.response?.data;
      setFormError(
        data?.errors?.map((e) => e.message).join(', ') || data?.message || 'Something went wrong'
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSupplier(deleteTarget._id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete supplier');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Suppliers</h1>
        {canManage && (
          <Button variant="primary" onClick={openAddForm}>
            + Add Supplier
          </Button>
        )}
      </div>

      {loadError && <p className="banner banner-error">{loadError}</p>}

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="filters-search"
        />
      </div>

      {loading ? (
        <Loader label="Loading suppliers..." />
      ) : (
        <SupplierTable
          suppliers={suppliers}
          canManage={canManage}
          onEdit={openEditForm}
          onDelete={setDeleteTarget}
        />
      )}

      <SupplierForm
        open={formOpen}
        supplier={editingSupplier}
        onSubmit={handleFormSubmit}
        onCancel={() => setFormOpen(false)}
        error={formError}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default Suppliers;
