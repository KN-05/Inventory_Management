// src/components/products/ProductDetailsModal.jsx
// PHASE 6: read-only "Product Details" view - shows everything about one
// product (photo, SKU, barcode, category, supplier, stock, price, status)
// in one place, per the spec's "Product Details" page requirement.
// Reuses AnimatedModal for consistent modal chrome/animation instead of
// building a new dialog component from scratch.
//
// PHASE 7: added the "Stock History" section promised back in Phase 6 -
// now that StockMovement records actually exist (written by receiving a
// Purchase, or by the manual increase/decrease-stock actions), this shows
// them so anyone can see WHY the current quantity is what it is. Sales
// history will be added here once the Sales phase exists.

import { useEffect, useState } from 'react';
import AnimatedModal from '../common/AnimatedModal';
import Button from '../common/Button';
import Loader from '../common/Loader';
import { API_ORIGIN } from '../../api/axiosInstance';
import { formatCurrency } from '../../utils/formatCurrency';
import { getProductStockMovements } from '../../api/products';

// Same status -> badge class mapping used in ProductTable.jsx, kept in
// sync manually since there's no shared StatusBadge component yet.
const statusClass = {
  'In Stock': 'badge badge-green',
  'Low Stock': 'badge badge-yellow',
  'Out of Stock': 'badge badge-red',
};

const movementTypeClass = {
  PURCHASE: 'badge badge-green',
  SALE: 'badge badge-red',
  RETURN: 'badge badge-green',
  ADJUSTMENT: 'badge badge-yellow',
  DAMAGE: 'badge badge-red',
  TRANSFER: 'badge',
};

function DetailItem({ label, value, full }) {
  return (
    <div className={full ? 'detail-grid-full' : undefined}>
      <div className="detail-item-label">{label}</div>
      <div className="detail-item-value">{value}</div>
    </div>
  );
}

function ProductDetailsModal({ open, product, onClose }) {
  const [movements, setMovements] = useState(null);
  const [movementsError, setMovementsError] = useState('');

  // Fetch stock history fresh every time a different product is opened.
  useEffect(() => {
    if (!open || !product) {
      setMovements(null);
      return;
    }
    setMovements(null);
    setMovementsError('');
    getProductStockMovements(product._id)
      .then((data) => setMovements(data.movements))
      .catch((err) => setMovementsError(err.response?.data?.message || 'Failed to load stock history'));
  }, [open, product]);

  if (!product) return null;

  const categoryName = product.category?.name || '-';
  const supplierName = product.supplier?.name || '-';

  return (
    <AnimatedModal open={open} onClose={onClose} maxWidth={520}>
      <h2>Product Details</h2>

      <div className="detail-photo-wrap">
        <div className="profile-photo profile-photo-small" style={{ cursor: 'default' }}>
          {product.image ? (
            <img src={`${API_ORIGIN}${product.image}`} alt={product.name} />
          ) : (
            <div className="profile-photo-placeholder">No Photo</div>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <DetailItem label="Name" value={product.name} full />
        <DetailItem label="SKU" value={product.sku || '-'} />
        <DetailItem label="Barcode" value={product.barcode || '-'} />
        <DetailItem label="Category" value={categoryName} />
        <DetailItem label="Supplier" value={supplierName} />
        <DetailItem label="Quantity In Stock" value={product.quantity} />
        <DetailItem label="Low Stock Threshold" value={product.lowStockThreshold} />
        <DetailItem label="Price" value={formatCurrency(product.price)} />
        <DetailItem label="Status" value={<span className={statusClass[product.status] || 'badge'}>{product.status}</span>} />
      </div>

      <h3 style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>Stock History</h3>
      {movementsError && <p className="form-error">{movementsError}</p>}
      {!movements && !movementsError && <Loader label="Loading stock history..." />}
      {movements && movements.length === 0 && (
        <p className="empty-state">No stock changes recorded for this product yet.</p>
      )}
      {movements && movements.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th className="col-numeric">Change</th>
              <th>Reason</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m._id}>
                <td>{new Date(m.createdAt).toLocaleString()}</td>
                <td>
                  <span className={movementTypeClass[m.type] || 'badge'}>{m.type}</span>
                </td>
                <td className="cell-numeric">
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity} ({m.previousStock} → {m.newStock})
                </td>
                <td>
                  {m.reason}
                  {m.reference && <span className="cell-mono"> ({m.reference})</span>}
                </td>
                <td>{m.performedBy?.name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
        <Button variant="secondary" type="button" onClick={onClose}>
          Close
        </Button>
      </div>
    </AnimatedModal>
  );
}

export default ProductDetailsModal;
