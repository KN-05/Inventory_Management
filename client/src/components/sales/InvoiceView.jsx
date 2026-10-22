// src/components/sales/InvoiceView.jsx
// Renders one Sale as a clean, print-friendly invoice. Used right after
// completing a sale and when viewing a past sale from history.
// `window.print()` covers "Print / Download": the browser's print dialog can
// print or "Save as PDF", so no extra library is needed.
//
// THREE kinds of bill exist in the database, and each is shown the way it was
// actually billed:
//   1. gstMode === 'inclusive'  (current) - the product price is the MRP
//      INCLUDING GST. The customer pays the MRP; the bill shows the GST that
//      is already inside it:  MRP -> Taxable value -> SGST / CGST / IGST ->
//      Total GST included -> Grand total (= the MRP less any discount).
//   2. gstApplied without gstMode - bills from the first GST release, where
//      GST was ADDED on top of the price. Shown as billed (never recomputed).
//   3. no GST fields - older bills with a single manual "Tax" line.
// Every figure comes from what the SERVER saved with the sale.

import AnimatedModal from '../common/AnimatedModal';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatRate, uniformRateLabel } from '../../utils/gst';

const paymentClass = {
  unpaid: 'badge badge-red',
  pending: 'badge badge-yellow',
  paid: 'badge badge-green',
};

// "₹6,483.05" with "9%" underneath
function GstCell({ amount, rate }) {
  return (
    <td className="cell-numeric">
      {formatCurrency(amount)}
      <span className="cell-sub">{formatRate(rate)}</span>
    </td>
  );
}

function TotalRow({ label, value, strong }) {
  return (
    <div className={`invoice-total-row${strong ? ' invoice-total-strong' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function InvoiceView({ open, sale, onClose }) {
  if (!sale) return null;

  const inclusive = sale.gstMode === 'inclusive';
  const hasGst = !!sale.gstApplied;
  const showIgst = inclusive || (hasGst && sale.totalIgst > 0);
  const itemsTotal = sale.items.reduce((sum, i) => sum + i.subtotal, 0);

  return (
    <AnimatedModal open={open} onClose={onClose} maxWidth={hasGst ? 900 : 640}>
      <div className="invoice-print-area">
        <div className="invoice-header">
          <div>
            <h2 style={{ margin: 0 }}>Inventory Manager</h2>
            <p className="page-subtitle" style={{ margin: 0 }}>
              {inclusive ? 'Invoice - prices include GST' : 'Invoice'}
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
          {inclusive && (
            <div>
              <div className="detail-item-label">Place of supply</div>
              <div className="detail-item-value">
                {sale.supplyType === 'inter' ? 'Other state (IGST)' : 'Within state (SGST + CGST)'}
              </div>
            </div>
          )}
        </div>

        <div className="invoice-table-scroll">
          {hasGst ? (
            <table className="data-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="col-numeric">Qty</th>
                  <th className="col-numeric">{inclusive ? 'MRP (GST inclusive)' : 'Price'}</th>
                  <th className="col-numeric">Taxable value</th>
                  <th className="col-numeric">SGST</th>
                  <th className="col-numeric">CGST</th>
                  {showIgst && <th className="col-numeric">IGST</th>}
                  <th className="col-numeric">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      {item.product?.name || 'Unknown product'}
                      <span className="cell-sub cell-mono">{item.product?.sku || '-'}</span>
                    </td>
                    <td className="cell-numeric">{item.quantity}</td>
                    <td className="cell-numeric">{formatCurrency(item.sellingPrice)}</td>
                    <td className="cell-numeric">
                      {formatCurrency(item.taxableValue)}
                      {item.discountShare > 0 && (
                        <span className="cell-sub">after {formatCurrency(item.discountShare)} discount</span>
                      )}
                    </td>
                    <GstCell amount={item.sgstAmount} rate={item.sgstRate} />
                    <GstCell amount={item.cgstAmount} rate={item.cgstRate} />
                    {showIgst && <GstCell amount={item.igstAmount} rate={item.igstRate} />}
                    <td className="cell-numeric">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
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
          )}
        </div>

        <div className="invoice-bottom">
          <div className="detail-grid invoice-payment">
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

          <div className="invoice-totals">
            {inclusive ? (
              <>
                <TotalRow label="MRP (GST inclusive)" value={formatCurrency(itemsTotal)} />
                {sale.discount > 0 && <TotalRow label="Discount" value={`- ${formatCurrency(sale.discount)}`} />}
                <TotalRow label="Taxable value" value={formatCurrency(sale.taxableTotal)} />
                <TotalRow label={`SGST${uniformRateLabel(sale.items, 'sgstRate')}`} value={formatCurrency(sale.totalSgst)} />
                <TotalRow label={`CGST${uniformRateLabel(sale.items, 'cgstRate')}`} value={formatCurrency(sale.totalCgst)} />
                <TotalRow label={`IGST${uniformRateLabel(sale.items, 'igstRate')}`} value={formatCurrency(sale.totalIgst)} />
                <TotalRow label="Total GST included" value={formatCurrency(sale.tax)} />
              </>
            ) : hasGst ? (
              <>
                <TotalRow label="Items Total" value={formatCurrency(itemsTotal)} />
                {sale.discount > 0 && <TotalRow label="Discount" value={`- ${formatCurrency(sale.discount)}`} />}
                <TotalRow label="Taxable value" value={formatCurrency(sale.taxableTotal)} />
                <TotalRow label="SGST" value={formatCurrency(sale.totalSgst)} />
                <TotalRow label="CGST" value={formatCurrency(sale.totalCgst)} />
                {showIgst && <TotalRow label="IGST" value={formatCurrency(sale.totalIgst)} />}
                <TotalRow label="Total GST (added)" value={formatCurrency(sale.tax)} />
              </>
            ) : (
              <>
                <TotalRow label="Items Total" value={formatCurrency(itemsTotal)} />
                <TotalRow label="Discount" value={`- ${formatCurrency(sale.discount)}`} />
                <TotalRow label="Tax" value={`+ ${formatCurrency(sale.tax)}`} />
              </>
            )}
            <TotalRow label="Grand total" value={formatCurrency(sale.totalAmount)} strong />
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
