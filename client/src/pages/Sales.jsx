// src/pages/Sales.jsx
// PHASE 8: the point-of-sale / billing screen. Two views toggled by a
// simple tab bar:
//   - "New Sale": build a cart (product/barcode search, quantity,
//     per-line price), pick an optional customer, set discount/tax/
//     payment, then checkout - which calls POST /sales once, atomically.
//   - "Sales History": past invoices, with View + (Admin/Manager) Cancel.
//
// Available to Admin, Manager, AND Staff (per the spec's Staff Allowed
// list: "Sales", "Basic billing", "Barcode scanning") - only the Cancel
// action in history is hidden for Staff (no SALES_CANCEL permission).
//
// PHASE 31: added a "📷 Scan" button next to the search box that opens
// BarcodeScannerModal - lets anyone add a product via their device's
// camera when no dedicated USB/Bluetooth barcode scanner is connected.
//
// PHASE 32: scanning is now continuous (the camera modal stays open
// after each scan, so several products can be added back-to-back), with
// a louder success beep, a distinct error buzz when a scanned code
// doesn't match any product, and a short cooldown per code so holding a
// barcode in view doesn't add it to the cart dozens of times per second.

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { getProductOptions } from '../api/lookups';
import { getCustomers, createCustomer } from '../api/customers';
import { getSales, createSale, cancelSale, exportSalesCsv } from '../api/sales';
import { downloadBlob } from '../utils/downloadBlob';
import { playSuccessBeep, playErrorBeep } from '../utils/scanSounds';

import CustomerForm from '../components/customers/CustomerForm';
import InvoiceView from '../components/sales/InvoiceView';
import SalesHistoryTable from '../components/sales/SalesHistoryTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import BarcodeScannerModal from '../components/common/BarcodeScannerModal';
import PageHeader from '../components/common/PageHeader';
import { formatCurrency } from '../utils/formatCurrency';
import { Minus, Plus, ReceiptText, ScanBarcode, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { ICON_SM } from '../utils/iconProps';
import { calculateGst, formatRate, uniformRateLabel } from '../utils/gst';

// PHASE 32: ignore the same scanned code if it comes in again within
// this window - prevents one barcode held in front of the camera from
// being added to the cart repeatedly while the frame keeps re-decoding it.
const SCAN_COOLDOWN_MS = 1500;

// "SGST 9% + CGST 9%" / "IGST 18%" / "No GST" - the rates APPLIED to this
// line (which depend on the place of supply).
function appliedLabel(line) {
  const parts = [];
  if (line.sgstRate > 0) parts.push(`SGST ${formatRate(line.sgstRate)}`);
  if (line.cgstRate > 0) parts.push(`CGST ${formatRate(line.cgstRate)}`);
  if (line.igstRate > 0) parts.push(`IGST ${formatRate(line.igstRate)}`);
  return parts.length ? parts.join(' + ') : 'No GST';
}

function QtyStepper({ value, max, onChange }) {
  const n = Number(value) || 0;
  return (
    <div className="qty-stepper">
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(Math.max(1, n - 1))} disabled={n <= 1}>
        <Minus size={14} strokeWidth={2} />
      </button>
      <input
        type="number"
        min="1"
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Quantity"
      />
      <button type="button" aria-label="Increase quantity" onClick={() => onChange(Math.min(max, n + 1))} disabled={n >= max}>
        <Plus size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

function Sales() {
  const { isAdmin, isManager } = useAuth();
  const canCancel = isAdmin || isManager; // matches PERMISSIONS.SALES_CANCEL grants
  const toast = useToast();

  const [tab, setTab] = useState('new'); // 'new' | 'history'

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [cart, setCart] = useState([]);
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  // Place of supply decides the GST structure: within the state = SGST + CGST,
  // another state = IGST (never both).
  const [supplyType, setSupplyType] = useState('intra');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const lastScanRef = useRef({ code: '', time: 0 });

  const [sales, setSales] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [viewingSale, setViewingSale] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadLookups = useCallback(async () => {
    const [prods, custData] = await Promise.all([getProductOptions(), getCustomers({ limit: 1000 })]);
    setProducts(prods);
    setCustomers(custData.customers);
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await getSales({ search: historySearch || undefined });
      setSales(data.sales);
    } catch (err) {
      setHistoryError(err.response?.data?.message || 'Failed to load sales history');
    } finally {
      setHistoryLoading(false);
    }
  }, [historySearch]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  const filteredProducts = productQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(productQuery.toLowerCase()) ||
          p.sku?.toLowerCase().includes(productQuery.toLowerCase()) ||
          p.barcode?.includes(productQuery)
      )
    : products;

  // Adds one unit. Never lets the cart go past the stock on hand (the
  // server enforces this too). Returns true if a unit was added, so the
  // scanner can play the right sound.
  const addToCart = (product) => {
    if (!product) return false;
    const existing = cart.find((line) => line.product._id === product._id);
    const currentQty = existing ? Number(existing.quantity) || 0 : 0;
    if (currentQty + 1 > product.quantity) {
      toast.error(
        product.quantity > 0
          ? `Only ${product.quantity} of "${product.name}" in stock`
          : `"${product.name}" is out of stock`
      );
      return false;
    }
    setCart((prev) => {
      const line = prev.find((l) => l.product._id === product._id);
      if (line) {
        return prev.map((l) =>
          l.product._id === product._id ? { ...l, quantity: (Number(l.quantity) || 0) + 1 } : l
        );
      }
      return [...prev, { product, quantity: 1, sellingPrice: product.price }];
    });
    return true;
  };

  const handleAddSelected = () => {
    const product = products.find((p) => p._id === selectedProductId);
    addToCart(product);
    setSelectedProductId('');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const query = productQuery.trim().toLowerCase();
    if (!query) return;
    const match = products.find(
      (p) => p.sku?.toLowerCase() === query || p.barcode?.toLowerCase() === query
    );
    if (match) {
      addToCart(match);
      setProductQuery('');
    }
  };

  // PHASE 32: shared by the camera scanner modal. Debounces repeat scans
  // of the same code, plays a louder success beep on match / a distinct
  // error buzz on no-match, and keeps the camera modal OPEN so more
  // products can be scanned right after - it no longer auto-closes.
  const handleCameraScan = (code) => {
    const query = (code || '').trim().toLowerCase();
    if (!query) return;

    const now = Date.now();
    if (lastScanRef.current.code === query && now - lastScanRef.current.time < SCAN_COOLDOWN_MS) {
      return;
    }
    lastScanRef.current = { code: query, time: now };

    const match = products.find(
      (p) => p.sku?.toLowerCase() === query || p.barcode?.toLowerCase() === query
    );
    if (match) {
      if (addToCart(match)) {
        playSuccessBeep();
        toast.success(`Added "${match.name}" to cart`);
      } else {
        playErrorBeep();
      }
    } else {
      playErrorBeep();
      toast.error(`No product found for scanned code "${code}"`);
    }
  };

  // The scanner modal restarts the camera whenever its onScan prop changes,
  // so give it a stable function that always calls the latest handler.
  const scanHandlerRef = useRef(null);
  scanHandlerRef.current = handleCameraScan;
  const stableOnScan = useCallback((code) => scanHandlerRef.current?.(code), []);

  const updateCartLine = (productId, field, value) => {
    setCart((prev) =>
      prev.map((line) => (line.product._id === productId ? { ...line, [field]: value } : line))
    );
  };

  const removeCartLine = (productId) =>
    setCart((prev) => prev.filter((line) => line.product._id !== productId));

  // Live GST preview. Same maths the server uses (utils/gst.js); the server
  // recalculates everything when the sale is saved, so the saved invoice is
  // always the server's figure.
  const gst = useMemo(
    () =>
      calculateGst(
        cart.map((line) => ({
          subtotal: (Number(line.quantity) || 0) * (Number(line.sellingPrice) || 0),
          sgstRate: line.product.sgstRate,
          cgstRate: line.product.cgstRate,
          igstRate: line.product.igstRate,
        })),
        Number(discount) || 0,
        supplyType
      ),
    [cart, discount, supplyType]
  );
  const itemsTotal = gst.totals.itemsTotal;
  const grandTotal = gst.totals.grandTotal;
  const discountTooHigh = (Number(discount) || 0) > itemsTotal;
  // Lines that would be rejected at checkout: bad quantity, over stock, bad price.
  const lineProblem = (line) => {
    const qty = Number(line.quantity);
    if (!Number.isInteger(qty) || qty < 1) return 'Enter a quantity of 1 or more';
    if (qty > line.product.quantity) return `Only ${line.product.quantity} in stock`;
    if (!(Number(line.sellingPrice) >= 0) || line.sellingPrice === '') return 'Enter a valid price';
    return '';
  };
  const hasLineProblems = cart.some((line) => lineProblem(line));
  const canCheckout = cart.length > 0 && !checkingOut && !discountTooHigh && !hasLineProblems;

  const resetCart = () => {
    setCart([]);
    setCustomerId('');
    setDiscount(0);
    setSupplyType('intra');
    setPaymentMethod('Cash');
    setPaymentStatus('paid');
  };

  const handleCheckout = async () => {
    if (!canCheckout) return;
    setCheckoutError('');
    setCheckingOut(true);
    try {
      const data = await createSale({
        customer: customerId || undefined,
        items: cart.map((line) => ({
          product: line.product._id,
          quantity: Number(line.quantity),
          sellingPrice: Number(line.sellingPrice),
        })),
        discount: Number(discount) || 0,
        supplyType,
        paymentMethod,
        paymentStatus,
      });
      toast.success(`Sale ${data.sale.invoiceNumber} completed`);
      setCompletedSale(data.sale);
      resetCart();
      loadLookups();
    } catch (err) {
      setCheckoutError(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleNewCustomer = async (data) => {
    const result = await createCustomer(data);
    toast.success('Customer added');
    setCustomers((prev) => [...prev, result.customer]);
    setCustomerId(result.customer._id);
    setCustomerFormOpen(false);
  };

  const confirmCancelSale = async () => {
    try {
      await cancelSale(cancelTarget._id);
      toast.success(`"${cancelTarget.invoiceNumber}" cancelled - stock restored`);
      setCancelTarget(null);
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel sale');
      setCancelTarget(null);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportSalesCsv();
      downloadBlob(blob, 'sales-export.csv');
    } catch (err) {
      toast.error('Failed to export sales: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="page">
      <PageHeader title="Sales / Billing" subtitle="Ring up a new sale or review past invoices" />

      <div className="pos-tabs">
        <button
          type="button"
          className={`pos-tab${tab === 'new' ? ' pos-tab-active' : ''}`}
          onClick={() => setTab('new')}
        >
          <ShoppingCart {...ICON_SM} /> New Sale
        </button>
        <button
          type="button"
          className={`pos-tab${tab === 'history' ? ' pos-tab-active' : ''}`}
          onClick={() => setTab('history')}
        >
          <ReceiptText {...ICON_SM} /> Sales History
        </button>
      </div>

      {tab === 'new' && (
        <>
          {checkoutError && <p className="banner banner-error">{checkoutError}</p>}

          <div className="pos-layout">
            <div className="pos-main">
              <section className="panel" aria-label="Add a product">
                <div className="panel-header">
                  <h2 className="panel-title">Add a product</h2>
                  <span className="panel-note">Scan or type a barcode / SKU and press Enter</span>
                </div>
                <div className="panel-body">
                  <div className="pos-add-row">
                    <div className="field field-grow">
                      <label htmlFor="pos-search">Search by name, SKU or barcode</label>
                      <input
                        id="pos-search"
                        type="text"
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Type or scan..."
                        autoComplete="off"
                      />
                    </div>
                    <div className="field field-grow">
                      <label htmlFor="pos-pick">Or pick from list</label>
                      <select id="pos-pick" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                        <option value="">Select a product</option>
                        {filteredProducts.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.sku}) - {p.quantity} in stock
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="pos-add-actions">
                      <Button variant="secondary" type="button" onClick={handleAddSelected} disabled={!selectedProductId}>
                        <Plus {...ICON_SM} /> Add to cart
                      </Button>
                      <Button variant="secondary" type="button" onClick={() => setScannerOpen(true)}>
                        <ScanBarcode {...ICON_SM} /> Scan
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel" aria-label="Cart">
                <div className="panel-header">
                  <h2 className="panel-title">
                    Cart {cart.length > 0 && <span className="pos-cart-count">{cart.length}</span>}
                  </h2>
                  {cart.length > 0 && (
                    <button type="button" className="btn-link btn-link-danger" onClick={() => setCart([])}>
                      Clear cart
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="panel-empty">
                    <strong>Cart is empty</strong>
                    Search, scan or select a product above to start a sale.
                  </div>
                ) : (
                  <div className="panel-scroll">
                    <table className="data-table cart-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th className="col-numeric">MRP (incl. GST)</th>
                          <th>Qty</th>
                          <th className="col-numeric">GST included</th>
                          <th className="col-numeric">Total</th>
                          <th>
                            <span className="sr-only">Remove</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((line, i) => {
                          const g = gst.lines[i];
                          const problem = lineProblem(line);
                          return (
                            <tr key={line.product._id}>
                              <td>
                                {line.product.name}
                                <span className="cell-sub cell-mono">{line.product.sku}</span>
                                <span className="cell-sub">{appliedLabel(g)}</span>
                              </td>
                              <td className="cell-numeric">
                                <span className="price-input">
                                  <span aria-hidden="true">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.sellingPrice}
                                    onChange={(e) => updateCartLine(line.product._id, 'sellingPrice', e.target.value)}
                                    aria-label={`Price of ${line.product.name}`}
                                  />
                                </span>
                              </td>
                              <td>
                                <QtyStepper
                                  value={line.quantity}
                                  max={line.product.quantity}
                                  onChange={(v) => updateCartLine(line.product._id, 'quantity', v)}
                                />
                                {problem && <span className="field-error">{problem}</span>}
                              </td>
                              <td className="cell-numeric">
                                {formatCurrency(g.gstTotal)}
                                {g.gstTotal > 0 && (
                                  <span className="cell-sub">
                                    {[
                                      g.sgstAmount > 0 && `SGST ${formatCurrency(g.sgstAmount)}`,
                                      g.cgstAmount > 0 && `CGST ${formatCurrency(g.cgstAmount)}`,
                                      g.igstAmount > 0 && `IGST ${formatCurrency(g.igstAmount)}`,
                                    ]
                                      .filter(Boolean)
                                      .join(' + ')}
                                  </span>
                                )}
                              </td>
                              <td className="cell-numeric">{formatCurrency(g.lineTotal)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  aria-label={`Remove ${line.product.name} from cart`}
                                  onClick={() => removeCartLine(line.product._id)}
                                >
                                  <Trash2 {...ICON_SM} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <aside className="pos-side" aria-label="Order summary">
              <section className="panel">
                <div className="panel-header">
                  <h2 className="panel-title">Order summary</h2>
                </div>
                <div className="panel-body pos-form">
                  <div className="field">
                    <label htmlFor="pos-customer">Customer</label>
                    <div className="pos-customer-row">
                      <select id="pos-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                        <option value="">Walk-in customer</option>
                        {customers.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <Button variant="secondary" type="button" onClick={() => setCustomerFormOpen(true)}>
                        <Plus {...ICON_SM} /> New
                      </Button>
                    </div>
                  </div>

                  <div className="field-row-2">
                    <div className="field">
                      <label htmlFor="pos-method">Payment method</label>
                      <select id="pos-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option>Cash</option>
                        <option>Card</option>
                        <option>UPI</option>
                        <option>Bank Transfer</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="pos-status">Payment status</label>
                      <select id="pos-status" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="pos-supply">Place of supply</label>
                    <select id="pos-supply" value={supplyType} onChange={(e) => setSupplyType(e.target.value)}>
                      <option value="intra">Within state (SGST + CGST)</option>
                      <option value="inter">Other state (IGST)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="pos-discount">Discount (₹)</label>
                    <input
                      id="pos-discount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                    {discountTooHigh && (
                      <span className="field-error">Discount can't be more than the items total ({formatCurrency(itemsTotal)})</span>
                    )}
                  </div>

                  <dl className="summary-list">
                    <div className="summary-row">
                      <dt>MRP total (GST inclusive)</dt>
                      <dd>{formatCurrency(gst.totals.itemsTotal)}</dd>
                    </div>
                    {gst.totals.discount > 0 && (
                      <div className="summary-row">
                        <dt>Discount</dt>
                        <dd>- {formatCurrency(gst.totals.discount)}</dd>
                      </div>
                    )}
                    <div className="summary-row">
                      <dt>Taxable value</dt>
                      <dd>{formatCurrency(gst.totals.taxableTotal)}</dd>
                    </div>
                    <div className="summary-row">
                      <dt>SGST{uniformRateLabel(gst.lines, 'sgstRate')}</dt>
                      <dd>{formatCurrency(gst.totals.sgstTotal)}</dd>
                    </div>
                    <div className="summary-row">
                      <dt>CGST{uniformRateLabel(gst.lines, 'cgstRate')}</dt>
                      <dd>{formatCurrency(gst.totals.cgstTotal)}</dd>
                    </div>
                    <div className="summary-row">
                      <dt>IGST{uniformRateLabel(gst.lines, 'igstRate')}</dt>
                      <dd>{formatCurrency(gst.totals.igstTotal)}</dd>
                    </div>
                    <div className="summary-row">
                      <dt>Total GST included</dt>
                      <dd>{formatCurrency(gst.totals.gstTotal)}</dd>
                    </div>
                    <div className="summary-row summary-row-total">
                      <dt>Grand total</dt>
                      <dd>{formatCurrency(grandTotal)}</dd>
                    </div>
                  </dl>
                  <p className="field-hint">
                    Prices already include GST - the customer pays the MRP. The GST shown above is the part of it that is tax.
                  </p>

                  <Button variant="primary" type="button" className="btn-block btn-lg" onClick={handleCheckout} disabled={!canCheckout}>
                    {checkingOut ? 'Processing...' : `Complete sale · ${formatCurrency(grandTotal)}`}
                  </Button>
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {tab === 'history' && (
        <>
          {historyError && <p className="banner banner-error">{historyError}</p>}
          <div className="filters-bar" style={{ marginBottom: '1rem' }}>
            <div className="filters-search-wrap">
              <span className="filters-search-icon" aria-hidden="true">
            <Search {...ICON_SM} />
          </span>
              <input
                type="text"
                placeholder="Search by invoice number..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="filters-search"
              />
            </div>
            <Button variant="secondary" type="button" onClick={handleExport}>
              Export CSV
            </Button>
          </div>
          {historyLoading ? (
            <Loader label="Loading sales history..." />
          ) : (
            <SalesHistoryTable
              sales={sales}
              canCancel={canCancel}
              onView={setViewingSale}
              onCancel={setCancelTarget}
            />
          )}
        </>
      )}

      <CustomerForm
        open={customerFormOpen}
        customer={null}
        onSubmit={handleNewCustomer}
        onCancel={() => setCustomerFormOpen(false)}
        error=""
      />

      <InvoiceView open={!!completedSale} sale={completedSale} onClose={() => setCompletedSale(null)} />
      <InvoiceView open={!!viewingSale} sale={viewingSale} onClose={() => setViewingSale(null)} />

      <BarcodeScannerModal
        open={scannerOpen}
        onScan={stableOnScan}
        onClose={() => setScannerOpen(false)}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel this sale?"
        message={
          cancelTarget
            ? `This will restore stock for every product in "${cancelTarget.invoiceNumber}" and cannot be undone.`
            : ''
        }
        confirmLabel="Cancel Sale"
        onConfirm={confirmCancelSale}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}

export default Sales;
