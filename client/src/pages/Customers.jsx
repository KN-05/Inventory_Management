// src/pages/Customers.jsx
// PHASE 8: Customer management. Everyone (Admin/Manager/Staff) can view
// AND create customers (Staff too - "Customer creation/view" per the
// spec's Staff Allowed list); only Admin/Manager can edit/delete.

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, exportCustomersCsv } from '../api/customers';
import { downloadBlob } from '../utils/downloadBlob';

import CustomerTable from '../components/customers/CustomerTable';
import CustomerForm from '../components/customers/CustomerForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';

function Customers() {
  const { isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager; // edit/delete; everyone (incl. Staff) can create
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getCustomers({ search: search || undefined });
      setCustomers(data.customers);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const openAddForm = () => {
    setEditingCustomer(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (customer) => {
    setEditingCustomer(customer);
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async (data) => {
    setFormError('');
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer._id, data);
        toast.success('Customer updated');
      } else {
        await createCustomer(data);
        toast.success('Customer added');
      }
      setFormOpen(false);
      loadCustomers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomer(deleteTarget._id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer');
      setDeleteTarget(null);
    }
  };

  // PHASE 9: everyone who can view customers can export them (Staff included).
  const handleExport = async () => {
    try {
      const blob = await exportCustomersCsv();
      downloadBlob(blob, 'customers-export.csv');
    } catch (err) {
      toast.error('Failed to export customers: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Customers</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
          <Button variant="primary" onClick={openAddForm}>
            + Add Customer
          </Button>
        </div>
      </div>

      {loadError && <p className="banner banner-error">{loadError}</p>}

      <input
        type="text"
        placeholder="Search by name, phone, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="filters-search"
        style={{ marginBottom: '1rem' }}
      />

      {loading ? (
        <Loader label="Loading customers..." />
      ) : (
        <CustomerTable
          customers={customers}
          canManage={canManage}
          onEdit={openEditForm}
          onDelete={setDeleteTarget}
        />
      )}

      <CustomerForm
        open={formOpen}
        customer={editingCustomer}
        onSubmit={handleFormSubmit}
        onCancel={() => setFormOpen(false)}
        error={formError}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete customer?"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"?` : ''}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default Customers;
