// src/components/purchases/PurchaseForm.jsx
// PHASE 7: create/edit a Purchase Order. Editing is only offered while a
// purchase is still 'pending' (see Purchases.jsx - the Edit action is
// hidden once received/cancelled), so this form doesn't need to worry
// about touching a purchase that's already affected stock.

import { useEffect, useState } from 'react';
import AnimatedModal from '../common/AnimatedModal';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/formatCurrency';

const emptyItem = { product: '', quantity: 1, purchasePrice: 0 };
const emptyForm = { supplier: '', items: [{ ...emptyItem }], discount: 0, tax: 0 };

function PurchaseForm({ open, purchase, suppliers, products, onSubmit, onCancel, error }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (purchase) {
      setForm({
        supplier: purchase.supplier?._id || purchase.supplier || '',
        items: purchase.items.map((i) => ({
          product: i.product?._id || i.product,
          quantity: i.quantity,
          purchasePrice: i.purchasePrice,
        })),
        discount: purchase.discount || 0,
        tax: purchase.tax || 0,
      });
    } else {
      setForm(emptyForm);
    }
  }, [purchase, open]);

  const updateItem = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addItemRow = () => setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));

  const removeItemRow = (index) =>
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  // Live total, recalculated on every keystroke so the person sees the
  // real cost before submitting - mirrors what the backend will compute.
  const itemsTotal = form.items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.purchasePrice) || 0),
    0
  );
  const grandTotal = Math.max(itemsTotal - Number(form.discount || 0) + Number(form.tax || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        supplier: form.supplier,
        items: form.items.map((i) => ({
          product: i.product,
          quantity: Number(i.quantity),
          purchasePrice: Number(i.purchasePrice),
        })),
        discount: Number(form.discount) || 0,
        tax: Number(form.tax) || 0,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatedModal open={open} onClose={onCancel} maxWidth={640}>
      <h2>{purchase ? `Edit Purchase ${purchase.purchaseNumber}` : 'New Purchase Order'}</h2>

      {error && <p className="form-error">{error}</p>}

      <form className="modal-form" onSubmit={handleSubmit}>
        <label>Supplier</label>
        <select
          value={form.supplier}
          onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))}
          required
        >
          <option value="" disabled>
            Select a supplier
          </option>
          {suppliers.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>

        <label style={{ marginTop: '0.75rem' }}>Line Items</label>
        {form.items.map((item, index) => (
          <div className="form-row purchase-item-row" key={index}>
            <select
              value={item.product}
              onChange={(e) => updateItem(index, 'product', e.target.value)}
              required
            >
              <option value="" disabled>
                Select a product
              </option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
              required
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Purchase Price"
              value={item.purchasePrice}
              onChange={(e) => updateItem(index, 'purchasePrice', e.target.value)}
              required
            />
            <button
              type="button"
              className="btn-link btn-link-danger"
              onClick={() => removeItemRow(index)}
              disabled={form.items.length === 1}
              title={form.items.length === 1 ? 'A purchase needs at least one item' : 'Remove'}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn-link" onClick={addItemRow}>
          + Add another product
        </button>

        <div className="form-row" style={{ marginTop: '0.75rem' }}>
          <div>
            <label>Discount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.discount}
              onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))}
            />
          </div>
          <div>
            <label>Tax (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.tax}
              onChange={(e) => setForm((p) => ({ ...p, tax: e.target.value }))}
            />
          </div>
        </div>

        <p className="page-subtitle" style={{ textAlign: 'right', fontSize: '1rem', fontWeight: 700 }}>
          Total: {formatCurrency(grandTotal)}
        </p>

        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : purchase ? 'Save Changes' : 'Create Purchase Order'}
          </Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export default PurchaseForm;
