// src/components/sales/InvoiceView.jsx
// PHASE 8: renders one Sale as a clean, print-friendly invoice. Used both
// right after completing a sale and when viewing a past sale from
// history. `window.print()` covers "Print Invoice"; "Download" reuses
// the browser's print-to-PDF, which needs no extra library - keeping
// with the project's "don't add unnecessary dependencies" rule.

import AnimatedModal from '../common/AnimatedModal';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/formatCurrency';

const paymentClass = {
  unpaid: 'badge badge-red',
  pending: 'badge badge-yellow',
  paid: 'badge badge-green',
};

function InvoiceView({ open, sale, onClose }) {
  if (!sale) return null;

  const itemsTotal = sale.items.reduce((sum, i) => sum + i.subtotal, 0);

  return (
    <AnimatedModal open={open} onClose={onClose} maxWidth={640}>
      <div className="invoice-print-area">
        <div className="invoice-header">
          <div>
            <h2 style={{ margin: 0 }}>InvenTrack</h2>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Inventory Management System
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0 }}>{sale.invoiceNumber}</h3>
            <p className="page-subtitle" style={{ margin: 0 }}>
              {new Date(sale.createdAt).toLocaleString()}
            </p>
            <span className={sale.status === 'cancelled' ? 'badge badge-red' : 'badge badge-green'}>
              {sale.status === 'cancelled' ? 'Cancelled' : 'Completed'}
            </span>
          </div>
        </div>

        <div className="detail-grid" style={{ marginTop: '1rem' }}>
          <div>
            <div className="detail-item-label">Billed To</div>
            <div className="detail-item-value">{sale.customer?.name || 'Walk-in Customer'}</div>
          </div>
          <div>
            <div className="detail-item-label">Sold By</div>
            <div className="detail-item-value">{sale.soldBy?.name || '-'}</div>
          </div>
          {sale.customer?.phone && (
            <div>
              <div className="detail-item-label">Phone</div>
              <div className="detail-item-value">{sale.customer.phone}</div>
            </div>
          )}
          {sale.customer?.address && (
            <div>
              <div className="detail-item-label">Address</div>
              <div className="detail-item-value">
                {sale.customer.address}
                {sale.customer.city ? `, ${sale.customer.city}` : ''}
              </div>
            </div>
          )}
        </div>

        <table className="data-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th className="col-numeric">Qty</th>
              <th className="col-numeric">Unit Price</th>
              <th className="col-numeric">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => (
              <tr key={index}>
                <td>{item.product?.name || 'Unknown product'}</td>
                <td className="cell-mono">{item.product?.sku || '-'}</td>
                <td className="cell-numeric">{item.quantity}</td>
                <td className="cell-numeric">{formatCurrency(item.sellingPrice)}</td>
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
            <div className="detail-item-value">-{formatCurrency(sale.discount)}</div>
          </div>
          <div>
            <div className="detail-item-label">Tax</div>
            <div className="detail-item-value">+{formatCurrency(sale.tax)}</div>
          </div>
          <div>
            <div className="detail-item-label">Grand Total</div>
            <div className="detail-item-value">{formatCurrency(sale.totalAmount)}</div>
          </div>
          <div>
            <div className="detail-item-label">Payment Method</div>
            <div className="detail-item-value">{sale.paymentMethod}</div>
          </div>
          <div>
            <div className="detail-item-label">Payment Status</div>
            <div className="detail-item-value">
              <span className={paymentClass[sale.paymentStatus] || 'badge'}>{sale.paymentStatus}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-actions no-print" style={{ marginTop: '1.25rem' }}>
        <Button variant="secondary" type="button" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" type="button" onClick={() => window.print()}>
          Print / Download
        </Button>
      </div>
    </AnimatedModal>
  );
}

export default InvoiceView;
