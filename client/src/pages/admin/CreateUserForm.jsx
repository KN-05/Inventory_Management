// src/pages/admin/CreateUserForm.jsx
// PHASE 2: lets an Admin create a Manager (Accountant/Manager) or Staff
// account directly - since public self-registration is now closed once
// an Admin exists (see authController.js), this is the only way new
// accounts get created after the bootstrap Admin.

import { useState } from 'react';
import AnimatedModal from '../../components/common/AnimatedModal';
import Button from '../../components/common/Button';

const emptyForm = { name: '', email: '', password: '', role: 'staff' };

function CreateUserForm({ open, onSubmit, onCancel, error }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm(emptyForm);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatedModal open={open} onClose={onCancel}>
      <h2>Create User</h2>

      <p className="page-subtitle" style={{ marginBottom: '0.75rem' }}>
        Creates an Accountant/Manager or Staff account directly. To make someone Admin, create
        them here as any role first, then change their role from the user table.
      </p>

      {error && <p className="form-error">{error}</p>}

      <form className="modal-form" onSubmit={handleSubmit}>
        <label>Name</label>
        <input value={form.name} onChange={handleChange('name')} required />

        <label>Email</label>
        <input type="email" value={form.email} onChange={handleChange('email')} required />

        <label>Password</label>
        <input
          type="password"
          value={form.password}
          onChange={handleChange('password')}
          minLength={6}
          required
        />

        <label>Role</label>
        <select value={form.role} onChange={handleChange('role')}>
          <option value="staff">Staff</option>
          <option value="manager">Accountant/Manager</option>
        </select>

        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export default CreateUserForm;
