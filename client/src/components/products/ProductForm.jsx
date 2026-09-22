// src/components/products/ProductForm.jsx
// Modal form used for both "Add Product" and "Edit Product".
// If `product` is passed in, the form is pre-filled and acts as an edit;
// otherwise it's a blank "add" form. `onSubmit` receives the form data.
//
// PHASE 6: SKU and barcode are no longer typed in here - the backend
// auto-generates both on creation (see productController.js). When
// editing, SKU is always read-only (identity field, never editable).
//
// PHASE 30: barcode is now EDITABLE when editing an existing product,
// but only for Admin/Manager (Staff still sees it read-only) - matches
// the backend's updateProduct restriction. Still hidden entirely while
// adding a new product, since it doesn't exist yet.
//
// The product photo is uploaded separately via `onUploadImage`, once the
// product already exists - a brand-new product doesn't have an id yet
// for the image endpoint to attach to (same reasoning as the user's own
// profile photo upload).

import { useEffect, useState } from 'react';
import AnimatedModal from '../common/AnimatedModal';
import Button from '../common/Button';
import { API_ORIGIN } from '../../api/axiosInstance';
import { useAuth } from '../../context/useAuth';

const emptyForm = {
  name: '',
  category: '',
  supplier: '',
  quantity: 0,
  price: 0,
  lowStockThreshold: 10,
  barcode: '',
};

function ProductForm({ open, product, categories, suppliers, onSubmit, onCancel, onUploadImage, error }) {
  const { isAdmin, isManager } = useAuth();
  const canEditBarcode = isAdmin || isManager;

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Whenever the modal opens (or the product being edited changes),
  // reset the form fields accordingly.
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        category: product.category?._id || product.category || '',
        supplier: product.supplier?._id || product.supplier || '',
        quantity: product.quantity ?? 0,
        price: product.price ?? 0,
        lowStockThreshold: product.lowStockThreshold ?? 10,
        barcode: product.barcode || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [product, open]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        price: Number(form.price),
        lowStockThreshold: Number(form.lowStockThreshold),
      };
      // Only send barcode if it's actually editable in this session -
      // avoids Staff accidentally re-sending a read-only value that the
      // backend would reject anyway.
      if (!canEditBarcode) {
        delete payload.barcode;
      }
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !product) return;
    setImageUploading(true);
    try {
      await onUploadImage(product._id, file);
    } finally {
      setImageUploading(false);
      e.target.value = ''; // allow re-selecting the same file later
    }
  };

  return (
    <AnimatedModal open={open} onClose={onCancel}>
        <h2>{product ? 'Edit Product' : 'Add Product'}</h2>

        {error && <p className="form-error">{error}</p>}

        {/* PHASE 6: photo upload only makes sense once the product exists */}
        {product && (
          <div className="product-photo-field">
            <label
              className="profile-photo profile-photo-small"
              style={{ cursor: 'pointer' }}
              title="Click to change photo"
            >
              {product.image ? (
                <img src={`${API_ORIGIN}${product.image}`} alt={product.name} />
              ) : (
                <div className="profile-photo-placeholder">No Photo</div>
              )}
              <div className="profile-photo-overlay">{imageUploading ? '...' : 'Change'}</div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={handleImageSelect}
              />
            </label>
          </div>
        )}

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* SKU is always read-only. Barcode is editable for
              Admin/Manager only - Staff still sees it read-only. Both
              hidden entirely while adding a new product. */}
          {product && (
            <div className="form-row">
              <div>
                <label>SKU</label>
                <input value={product.sku || ''} readOnly disabled />
              </div>
              <div>
                <label>Barcode</label>
                {canEditBarcode ? (
                  <input value={form.barcode} onChange={handleChange('barcode')} />
                ) : (
                  <input value={product.barcode || ''} readOnly disabled />
                )}
              </div>
            </div>
          )}

          <label>Name</label>
          <input value={form.name} onChange={handleChange('name')} required />

          <label>Category</label>
          <select value={form.category} onChange={handleChange('category')} required>
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <label>Supplier</label>
          <select value={form.supplier} onChange={handleChange('supplier')} required>
            <option value="" disabled>
              Select a supplier
            </option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="form-row">
            <div>
              <label>Quantity</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={handleChange('quantity')}
                required
              />
            </div>
            <div>
              <label>Price (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange('price')}
                required
              />
            </div>
          </div>

          <label>Low Stock Threshold</label>
          <input
            type="number"
            min="0"
            value={form.lowStockThreshold}
            onChange={handleChange('lowStockThreshold')}
            required
          />

          {!product && (
            <p className="page-subtitle" style={{ marginTop: '-0.5rem' }}>
              SKU and barcode are generated automatically. You can add a photo after saving.
            </p>
          )}

          <div className="modal-actions">
            <Button variant="secondary" type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </form>
    </AnimatedModal>
  );
}

export default ProductForm;
