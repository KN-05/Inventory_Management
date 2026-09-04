// src/components/customers/CustomerForm.jsx
// Modal form for adding/editing a Customer. `totalPurchases`/`lastPurchase`
// are shown read-only when editing (they're derived from Sales, not
// editable here) - see models/Customer.js.

import { useEffect, useState } from 'react';
import AnimatedModal from '../common/AnimatedModal';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/formatCurrency';

const emptyForm = { name: '', phone: '', email: '', address: '', city: '' };

function CustomerForm({ open, customer, onSubmit, onCancel, error }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [customer, open]);

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatedModal open={open} onClose={onCancel}>
      <h2>{customer ? 'Edit Customer' : 'Add Customer'}</h2>

      {error && <p className="form-error">{error}</p>}

      {customer && (
        <p className="page-subtitle">
          Total Purchases: <strong>{formatCurrency(customer.totalPurchases)}</strong>
          {customer.lastPurchase && (
            <> &middot; Last purchase: {new Date(customer.lastPurchase).toLocaleDateString()}</>
          )}
        </p>
      )}

      <form className="modal-form" onSubmit={handleSubmit}>
        <label>Name</label>
        <input value={form.name} onChange={handleChange('name')} required />

        <div className="form-row">
          <div>
            <label>Phone</label>
            <input value={form.phone} onChange={handleChange('phone')} />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={form.email} onChange={handleChange('email')} />
          </div>
        </div>

        <label>Address</label>
        <input value={form.address} onChange={handleChange('address')} />

        <label>City</label>
        <input value={form.city} onChange={handleChange('city')} />

        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : customer ? 'Save Changes' : 'Add Customer'}
          </Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export default CustomerForm;
