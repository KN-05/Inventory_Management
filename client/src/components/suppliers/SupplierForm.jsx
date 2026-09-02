// src/components/suppliers/SupplierForm.jsx
//
// PHASE 6: expanded with the fuller "Supplier information" fields from
// the project spec (companyName, city, state, country, taxNumber,
// status) - all optional except name, matching the Supplier model.

import { useEffect, useState } from 'react';
import AnimatedModal from '../common/AnimatedModal';
import Button from '../common/Button';

const emptyForm = {
  name: '',
  companyName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: '',
  taxNumber: '',
  status: 'active',
};

function SupplierForm({ open, supplier, onSubmit, onCancel, error }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || '',
        companyName: supplier.companyName || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        city: supplier.city || '',
        state: supplier.state || '',
        country: supplier.country || '',
        taxNumber: supplier.taxNumber || '',
        status: supplier.status || 'active',
      });
    } else {
      setForm(emptyForm);
    }
  }, [supplier, open]);

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
    <AnimatedModal open={open} onClose={onCancel} maxWidth={520}>
      <h2>{supplier ? 'Edit Supplier' : 'Add Supplier'}</h2>

      {error && <p className="form-error">{error}</p>}

      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div>
            <label>Name</label>
            <input value={form.name} onChange={handleChange('name')} required />
          </div>
          <div>
            <label>Company Name</label>
            <input value={form.companyName} onChange={handleChange('companyName')} />
          </div>
        </div>

        <div className="form-row">
          <div>
            <label>Email</label>
            <input type="email" value={form.email} onChange={handleChange('email')} />
          </div>
          <div>
            <label>Phone</label>
            <input value={form.phone} onChange={handleChange('phone')} />
          </div>
        </div>

        <label>Address</label>
        <input value={form.address} onChange={handleChange('address')} />

        <div className="form-row">
          <div>
            <label>City</label>
            <input value={form.city} onChange={handleChange('city')} />
          </div>
          <div>
            <label>State</label>
            <input value={form.state} onChange={handleChange('state')} />
          </div>
        </div>

        <div className="form-row">
          <div>
            <label>Country</label>
            <input value={form.country} onChange={handleChange('country')} />
          </div>
          <div>
            <label>Tax Number</label>
            <input value={form.taxNumber} onChange={handleChange('taxNumber')} />
          </div>
        </div>

        <label>Status</label>
        <select value={form.status} onChange={handleChange('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : supplier ? 'Save Changes' : 'Add Supplier'}
          </Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export default SupplierForm;
