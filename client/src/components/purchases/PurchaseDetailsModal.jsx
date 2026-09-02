// src/components/purchases/PurchaseDetailsModal.jsx
// PHASE 7: read-only view of one purchase order's full line items - the
// table row can't show every product in a multi-item purchase, so this
// modal is where that detail lives.

import AnimatedModal from '../common/AnimatedModal';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/formatCurrency';

function PurchaseDetailsModal({ open, purchase, onClose }) {
  if (!purchase) return null;

  const itemsTotal = purchase.items.reduce((sum, i) => sum + i.subtotal, 0);

  return (
    <AnimatedModal open={open} onClose={onClose} maxWidth={600}>
      <h2>Purchase {purchase.purchaseNumber}</h2>
      <p className="page-subtitle">
        Supplier: <strong>{purchase.supplier?.name || '-'}</strong> &middot; Created by{' '}
        {purchase.createdBy?.name || '-'} on {new Date(purchase.createdAt).toLocaleDateString()}
      </p>

      <table className="data-table" style={{ marginTop: '0.75rem' }}>
        <thead>
          <tr>
            <th>Product</th>
            <th className="col-numeric">Qty</th>
            <th className="col-numeric">Purchase Price</th>
            <th className="col-numeric">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {purchase.items.map((item, index) => (
            <tr key={index}>
              <td>
                {item.product?.name || 'Unknown product'}
                {item.product?.sku && <span className="cell-mono"> ({item.product.sku})</span>}
              </td>
              <td className="cell-numeric">{item.quantity}</td>
              <td className="cell-numeric">{formatCurrency(item.purchasePrice)}</td>
              <td className="cell-numeric">{formatCurrency(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="detail-grid" style={{ marginTop: '1rem' }}>
        <div>
          <div className="detail-item-label">Items Total</div>
          <div className="detail-item-value">{formatCurrency(itemsTotal)}</div>
        </div>
        <div>
          <div className="detail-item-label">Discount</div>
          <div className="detail-item-value">-{formatCurrency(purchase.discount)}</div>
        </div>
        <div>
          <div className="detail-item-label">Tax</div>
          <div className="detail-item-value">+{formatCurrency(purchase.tax)}</div>
        </div>
        <div>
          <div className="detail-item-label">Grand Total</div>
          <div className="detail-item-value">{formatCurrency(purchase.totalAmount)}</div>
        </div>
        <div>
          <div className="detail-item-label">Status</div>
          <div className="detail-item-value">{purchase.status}</div>
        </div>
        <div>
          <div className="detail-item-label">Payment Status</div>
          <div className="detail-item-value">{purchase.paymentStatus}</div>
        </div>
        {purchase.receivedDate && (
          <div className="detail-grid-full">
            <div className="detail-item-label">Received On</div>
            <div className="detail-item-value">{new Date(purchase.receivedDate).toLocaleString()}</div>
          </div>
        )}
      </div>

      <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
        <Button variant="secondary" type="button" onClick={onClose}>
          Close
        </Button>
      </div>
    </AnimatedModal>
  );
}

export default PurchaseDetailsModal;
