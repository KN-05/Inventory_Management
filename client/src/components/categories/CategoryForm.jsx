// src/components/categories/CategoryForm.jsx
//
// PHASE 6: added an optional photo (uploaded separately via
// onUploadImage, same pattern as ProductForm.jsx - a new category
// doesn't have an id yet for the image endpoint) and a status field.

import { useEffect, useState } from 'react';
import AnimatedModal from '../common/AnimatedModal';
import Button from '../common/Button';
import { API_ORIGIN } from '../../api/axiosInstance';

const emptyForm = { name: '', description: '', status: 'active' };

function CategoryForm({ open, category, onSubmit, onCancel, onUploadImage, error }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name || '',
        description: category.description || '',
        status: category.status || 'active',
      });
    } else {
      setForm(emptyForm);
    }
  }, [category, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !category) return;
    setImageUploading(true);
    try {
      await onUploadImage(category._id, file);
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  return (
    <AnimatedModal open={open} onClose={onCancel}>
      <h2>{category ? 'Edit Category' : 'Add Category'}</h2>

      {error && <p className="form-error">{error}</p>}

      {category && (
        <div className="product-photo-field">
          <label
            className="profile-photo profile-photo-small"
            style={{ cursor: 'pointer' }}
            title="Click to change photo"
          >
            {category.image ? (
              <img src={`${API_ORIGIN}${category.image}`} alt={category.name} />
            ) : (
              <div className="profile-photo-placeholder">No Photo</div>
            )}
            <div className="profile-photo-overlay">{imageUploading ? '...' : 'Change'}</div>
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleImageSelect} />
          </label>
        </div>
      )}

      <form className="modal-form" onSubmit={handleSubmit}>
        <label>Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
        />

        <label>Description</label>
        <input
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />

        <label>Status</label>
        <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {!category && (
          <p className="page-subtitle" style={{ marginTop: '-0.5rem' }}>
            You can add a photo after saving.
          </p>
        )}

        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : category ? 'Save Changes' : 'Add Category'}
          </Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export default CategoryForm;
