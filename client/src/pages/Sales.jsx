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

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getProductOptions } from '../api/lookups';
import { getCustomers, createCustomer } from '../api/customers';
import { getSales, createSale, cancelSale, exportSalesCsv } from '../api/sales';
import { downloadBlob } from '../utils/downloadBlob';

import CustomerForm from '../components/customers/CustomerForm';
import InvoiceView from '../components/sales/InvoiceView';
import SalesHistoryTable from '../components/sales/SalesHistoryTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import { formatCurrency } from '../utils/formatCurrency';

function Sales() {
  const { isAdmin, isManager } = useAuth();
  const canCancel = isAdmin || isManager; // matches PERMISSIONS.SALES_CANCEL grants
  const toast = useToast();

  const [tab, setTab] = useState('new'); // 'new' | 'history'

  // Lookup data for the cart
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Cart / checkout state
  const [cart, setCart] = useState([]); // [{ product, quantity, sellingPrice }]
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [checkoutError, setCheckoutError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState(null); // shows InvoiceView right after checkout

  // History
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

  // Filters the product dropdown by name/SKU/barcode as the person types.
  const filteredProducts = productQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(productQuery.toLowerCase()) ||
          p.sku?.toLowerCase().includes(productQuery.toLowerCase()) ||
          p.barcode?.includes(productQuery)
      )
    : products;

  const addToCart = (product) => {
    if (!product) return;
    setCart((prev) => {
      const existing = prev.find((line) => line.product._id === product._id);
      if (existing) {
        return prev.map((line) =>
          line.product._id === product._id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...prev, { product, quantity: 1, sellingPrice: product.price }];
    });
  };

  const handleAddSelected = () => {
    const product = products.find((p) => p._id === selectedProductId);
    addToCart(product);
    setSelectedProductId('');
  };

  // PHASE 8 "barcode scanning": typing/scanning an exact SKU or barcode
  // and pressing Enter adds it straight to the cart - no dropdown needed.
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

  const updateCartLine = (productId, field, value) => {
    setCart((prev) =>
      prev.map((line) => (line.product._id === productId ? { ...line, [field]: value } : line))
    );
  };

  const removeCartLine = (productId) =>
    setCart((prev) => prev.filter((line) => line.product._id !== productId));

  const itemsTotal = cart.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.sellingPrice) || 0),
    0
  );
  const grandTotal = Math.max(itemsTotal - Number(discount || 0) + Number(tax || 0), 0);

  const resetCart = () => {
    setCart([]);
    setCustomerId('');
    setDiscount(0);
    setTax(0);
    setPaymentMethod('Cash');
    setPaymentStatus('paid');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
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
        tax: Number(tax) || 0,
        paymentMethod,
        paymentStatus,
      });
      toast.success(`Sale ${data.sale.invoiceNumber} completed`);
      setCompletedSale(data.sale);
      resetCart();
      loadLookups(); // refresh product stock + customer totals
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

  // PHASE 9: everyone who can view sales can export them (Staff included).
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
      <div className="page-header">
        <h1>Sales</h1>
      </div>

      <div className="filters-bar" style={{ marginBottom: '1rem' }}>
        <Button variant={tab === 'new' ? 'primary' : 'secondary'} type="button" onClick={() => setTab('new')}>
          New Sale
        </Button>
        <Button
          variant={tab === 'history' ? 'primary' : 'secondary'}
          type="button"
          onClick={() => setTab('history')}
        >
          Sales History
        </Button>
      </div>

      {tab === 'new' && (
        <>
          {checkoutError && <p className="banner banner-error">{checkoutError}</p>}

          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div>
              <label>Search product by name, SKU, or scan barcode + Enter</label>
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Type or scan..."
              />
            </div>
            <div>
              <label>Or pick from list</label>
              <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                <option value="">Select a product</option>
                {filteredProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.sku}) - {p.quantity} in stock
                  </option>
                ))}
              </select>
            </div>
            <Button variant="secondary" type="button" onClick={handleAddSelected} disabled={!selectedProductId}>
              + Add to Cart
            </Button>
          </div>

          {cart.length === 0 ? (
            <p className="empty-state" style={{ marginTop: '1rem' }}>
              Cart is empty. Search or select a product above to start a sale.
            </p>
          ) : (
            <table className="data-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="col-numeric">Qty</th>
                  <th className="col-numeric">Unit Price</th>
                  <th className="col-numeric">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((line) => (
                  <tr key={line.product._id}>
                    <td>{line.product.name}</td>
                    <td className="cell-numeric">
                      <input
                        type="number"
                        min="1"
                        max={line.product.quantity}
                        value={line.quantity}
                        onChange={(e) => updateCartLine(line.product._id, 'quantity', e.target.value)}
                        style={{ width: '70px' }}
                      />
                    </td>
                    <td className="cell-numeric">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.sellingPrice}
                        onChange={(e) => updateCartLine(line.product._id, 'sellingPrice', e.target.value)}
                        style={{ width: '90px' }}
                      />
                    </td>
                    <td className="cell-numeric">
                      {formatCurrency((Number(line.quantity) || 0) * (Number(line.sellingPrice) || 0))}
                    </td>
                    <td>
                      <button className="btn-link btn-link-danger" onClick={() => removeCartLine(line.product._id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="form-row" style={{ marginTop: '1rem', alignItems: 'flex-end' }}>
            <div>
              <label>Customer (optional)</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="secondary" type="button" onClick={() => setCustomerFormOpen(true)}>
              + New Customer
            </Button>
          </div>

          <div className="form-row" style={{ marginTop: '0.75rem' }}>
            <div>
              <label>Discount (₹)</label>
              <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div>
              <label>Tax (₹)</label>
              <input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
            <div>
              <label>Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label>Payment Status</label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <p className="page-subtitle" style={{ textAlign: 'right', fontSize: '1.1rem', fontWeight: 700, marginTop: '0.75rem' }}>
            Total: {formatCurrency(grandTotal)}
          </p>

          <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || checkingOut}
            >
              {checkingOut ? 'Processing...' : 'Complete Sale'}
            </Button>
          </div>
        </>
      )}

      {tab === 'history' && (
        <>
          {historyError && <p className="banner banner-error">{historyError}</p>}
          <div className="filters-bar" style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Search by invoice number..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="filters-search"
            />
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
