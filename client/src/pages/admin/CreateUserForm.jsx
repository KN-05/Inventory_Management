// src/pages/admin/CreateUserForm.jsx
// Lets an Admin create Manager/Staff accounts inside the current business.
// Independent Admins must use the separate business sign-up/onboarding flow.

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
        Creates an Accountant/Manager or Staff account inside your business. An independent Admin
        must create a separate business account using the New User sign-up flow.
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
