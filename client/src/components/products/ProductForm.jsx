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

import { useEffect, useMemo, useState } from 'react';
import AnimatedModal from '../common/AnimatedModal';
import Button from '../common/Button';
import { API_ORIGIN } from '../../api/axiosInstance';
import { useAuth } from '../../context/useAuth';
import { formatCurrency } from '../../utils/formatCurrency';
import { productGst, formatRate } from '../../utils/gst';
import {
  MAX_PRICE,
  MAX_QUANTITY,
  parsePrice,
  parseQuantity,
} from '../../utils/productLimits';

const emptyForm = {
  name: '',
  category: '',
  supplier: '',
  quantity: 0,
  price: '', // no default: a price of 0 is not allowed, so the person must enter one
  lowStockThreshold: 10,
  barcode: '',
  sgstRate: 0,
  cgstRate: 0,
  igstRate: 0,
};

// LIMITS: JavaScript validation (the HTML min/max attributes below are only a
// hint - they do not stop pasted values, autofill or keyboard tricks, and the
// server re-validates everything anyway). Returns { field: message } for every
// invalid field; an empty object means the form is valid.
function validateForm(form) {
  const errors = {};
  if (!String(form.name).trim()) errors.name = 'Product name is required.';
  if (!form.category) errors.category = 'Category is required.';
  if (!form.supplier) errors.supplier = 'Supplier is required.';

  const quantity = parseQuantity(form.quantity);
  if (!quantity.ok) errors.quantity = quantity.message;

  const price = parsePrice(form.price);
  if (!price.ok) errors.price = price.message;

  const threshold = Number(form.lowStockThreshold);
  if (String(form.lowStockThreshold).trim() === '' || !Number.isInteger(threshold) || threshold < 0) {
    errors.lowStockThreshold = 'Low stock threshold must be a whole number, 0 or greater.';
  }

  ['sgstRate', 'cgstRate', 'igstRate'].forEach((field) => {
    const value = Number(form[field]);
    if (String(form[field]).trim() !== '' && (!Number.isFinite(value) || value < 0 || value > 100)) {
      errors[field] = 'GST rate must be between 0 and 100.';
    }
  });
  return errors;
}

// Number inputs happily accept "e", "+" and "-" (1e9, -5). None of them is
// valid for a price or a quantity, so don't let them be typed at all.
const blockNonNumericKeys = (e) => {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
};

// Live breakdown of the price the person is typing. The price is the MRP
// INCLUDING GST, so this shows the GST already inside it (nothing is added):
//   Price including GST 85,000 = Taxable value 72,033.90 + GST 12,966.10
function PreviewRow({ label, value, strong }) {
  return (
    <div className={`gst-preview-row${strong ? ' gst-preview-strong' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function GstPreview({ form }) {
  const g = productGst({
    price: form.price,
    sgstRate: form.sgstRate,
    cgstRate: form.cgstRate,
    igstRate: form.igstRate,
  });
  return (
    <div className="gst-preview" aria-live="polite">
      <dl>
        <PreviewRow label="Price including GST" value={formatCurrency(g.mrp)} />
        <PreviewRow label="Taxable value" value={formatCurrency(g.taxableValue)} />
        <PreviewRow label={`SGST (${formatRate(g.sgstRate)})`} value={formatCurrency(g.sgstAmount)} />
        <PreviewRow label={`CGST (${formatRate(g.cgstRate)})`} value={formatCurrency(g.cgstAmount)} />
        <PreviewRow label={`IGST (${formatRate(g.igstRate)})`} value={formatCurrency(g.igstAmount)} />
        <PreviewRow label="Total GST included" value={formatCurrency(g.gstIncluded)} strong />
      </dl>
      {g.interGstIncluded !== null && (
        <p className="field-hint" style={{ marginTop: '0.4rem' }}>
          Sold to another state, IGST {formatRate(g.interIgstRate)} applies instead (not SGST + CGST):{' '}
          {formatCurrency(g.interGstIncluded)} GST included.
        </p>
      )}
    </div>
  );
}

function ProductForm({ open, product, categories, suppliers, onSubmit, onCancel, onUploadImage, error }) {
  const { isAdmin, isManager } = useAuth();
  const canEditBarcode = isAdmin || isManager;

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [touched, setTouched] = useState({});
  const errors = useMemo(() => validateForm(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;

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
        sgstRate: product.sgstRate ?? 0,
        cgstRate: product.cgstRate ?? 0,
        igstRate: product.igstRate ?? 0,
      });
      // Editing: show problems straight away (e.g. an old product that is
      // already above the new limits) instead of waiting for a click.
      setTouched({ quantity: true, price: true });
    } else {
      setForm(emptyForm);
      setTouched({});
    }
  }, [product, open]);

  // Fires for typing, pasting AND browser autofill (all of them dispatch a
  // change event), so every route into the field is validated the same way.
  const handleChange = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  // Error text + red border only once the person has interacted with the
  // field; the red styling disappears on its own as soon as the value is fixed.
  const fieldError = (field) => (touched[field] ? errors[field] : undefined);
  const inputProps = (field) => ({
    className: fieldError(field) ? 'input-invalid' : undefined,
    'aria-invalid': fieldError(field) ? 'true' : undefined,
    'aria-describedby': fieldError(field) ? `err-${field}` : undefined,
    onBlur: handleBlur(field),
  });
  const renderError = (field) =>
    fieldError(field) ? (
      <span id={`err-${field}`} className="field-error" role="alert">
        {fieldError(field)}
      </span>
    ) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Last line of defence on the client: never submit while anything is invalid.
    if (hasErrors) {
      setTouched({
        name: true, category: true, supplier: true, quantity: true, price: true,
        lowStockThreshold: true, sgstRate: true, cgstRate: true, igstRate: true,
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        quantity: parseQuantity(form.quantity).value,
        price: parsePrice(form.price).value,
        lowStockThreshold: Number(form.lowStockThreshold),
        sgstRate: Number(form.sgstRate) || 0,
        cgstRate: Number(form.cgstRate) || 0,
        igstRate: Number(form.igstRate) || 0,
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

        <form className="modal-form" onSubmit={handleSubmit} noValidate>
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
          <input value={form.name} onChange={handleChange('name')} required {...inputProps('name')} />
          {renderError('name')}

          <label>Category</label>
          <select value={form.category} onChange={handleChange('category')} required {...inputProps('category')}>
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          {renderError('category')}

          <label>Supplier</label>
          <select value={form.supplier} onChange={handleChange('supplier')} required {...inputProps('supplier')}>
            <option value="" disabled>
              Select a supplier
            </option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          {renderError('supplier')}

          <div className="form-row">
            <div>
              <label htmlFor="pf-quantity">Quantity</label>
              <input
                id="pf-quantity"
                type="number"
                inputMode="numeric"
                min="0"
                max={MAX_QUANTITY}
                step="1"
                value={form.quantity}
                onChange={handleChange('quantity')}
                onKeyDown={blockNonNumericKeys}
                required
                {...inputProps('quantity')}
              />
              {renderError('quantity') || <span className="field-hint">0 to {MAX_QUANTITY} units</span>}
            </div>
            <div>
              <label htmlFor="pf-price">MRP incl. GST (₹)</label>
              <input
                id="pf-price"
                type="number"
                inputMode="decimal"
                min="0.01"
                max={MAX_PRICE}
                step="0.01"
                value={form.price}
                onChange={handleChange('price')}
                onKeyDown={blockNonNumericKeys}
                placeholder="e.g. 85000"
                required
                {...inputProps('price')}
              />
              {renderError('price') || (
                <span className="field-hint">Up to {formatCurrency(MAX_PRICE)}</span>
              )}
            </div>
          </div>

          <label htmlFor="pf-threshold">Low Stock Threshold</label>
          <input
            id="pf-threshold"
            type="number"
            min="0"
            step="1"
            value={form.lowStockThreshold}
            onChange={handleChange('lowStockThreshold')}
            onKeyDown={blockNonNumericKeys}
            required
            {...inputProps('lowStockThreshold')}
          />
          {renderError('lowStockThreshold')}

          {/* GST: stored per product and added automatically on every bill.
              The preview shows exactly what one unit will carry. */}
          <label style={{ marginTop: '1.1rem' }}>GST rates (already included in the MRP)</label>
          <div className="form-row">
            <div>
              <label htmlFor="gst-sgst" className="field-label-sm">SGST %</label>
              <input id="gst-sgst" type="number" min="0" max="100" step="0.01" value={form.sgstRate} onChange={handleChange('sgstRate')} {...inputProps('sgstRate')} />
              {renderError('sgstRate')}
            </div>
            <div>
              <label htmlFor="gst-cgst" className="field-label-sm">CGST %</label>
              <input id="gst-cgst" type="number" min="0" max="100" step="0.01" value={form.cgstRate} onChange={handleChange('cgstRate')} {...inputProps('cgstRate')} />
              {renderError('cgstRate')}
            </div>
            <div>
              <label htmlFor="gst-igst" className="field-label-sm">IGST %</label>
              <input id="gst-igst" type="number" min="0" max="100" step="0.01" value={form.igstRate} onChange={handleChange('igstRate')} {...inputProps('igstRate')} />
              {renderError('igstRate')}
            </div>
          </div>
          <GstPreview form={{ ...form, price: errors.price ? 0 : form.price }} />

          {!product && (
            <p className="page-subtitle" style={{ marginTop: '-0.5rem' }}>
              SKU and barcode are generated automatically. You can add a photo after saving.
            </p>
          )}

          <div className="modal-actions">
            <Button variant="secondary" type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting || hasErrors}>
              {submitting ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </form>
    </AnimatedModal>
  );
}

export default ProductForm;
