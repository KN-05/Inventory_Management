// src/components/dashboard/RecentTransactions.jsx
// The latest sales and purchase orders in one list, newest first. Built
// from the same GET /api/sales and GET /api/purchases responses the Sales
// and Purchases pages use - nothing is invented. Amounts are plain text:
// a purchase isn't "bad" and a sale isn't "good", so no red/green here.

import { Link } from 'react-router-dom';
import { ShoppingCart, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { ICON_SM } from '../../utils/iconProps';
import { PanelLoading, PanelError, PanelEmpty } from './PanelState';

const PAYMENT_BADGE = {
  paid: { className: 'badge badge-green', label: 'Paid' },
  pending: { className: 'badge badge-yellow', label: 'Payment pending' },
  unpaid: { className: 'badge badge-yellow', label: 'Unpaid' },
  partial: { className: 'badge badge-yellow', label: 'Part paid' },
};

function statusBadge(t) {
  if (t.status === 'cancelled') return { className: 'badge badge-red', label: 'Cancelled' };
  return PAYMENT_BADGE[t.paymentStatus] || { className: 'badge', label: t.paymentStatus || '—' };
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RecentTransactions({ rows, loading, error, onRetry, canCreateSale }) {
  return (
    <section className="panel" aria-label="Recent transactions">
      <div className="panel-header">
        <h2 className="panel-title">Recent transactions</h2>
        <Link to="/sales" className="panel-link">
          View sales
        </Link>
      </div>

      {loading ? (
        <PanelLoading rows={5} />
      ) : error ? (
        <PanelError message={error} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <PanelEmpty
          title="No transactions yet"
          action={
            canCreateSale && (
              <Link to="/sales" className="panel-link">
                Record your first sale
              </Link>
            )
          }
        >
          Sales and purchase orders will be listed here as they are created.
        </PanelEmpty>
      ) : (
        <div className="panel-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Customer / Supplier</th>
                <th>Date</th>
                <th className="col-numeric">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const badge = statusBadge(t);
                return (
                  <tr key={`${t.type}-${t.id}`}>
                    <td className="cell-mono">
                      {t.reference}
                      {t.type === 'purchase' && t.status === 'pending' && (
                        <span className="cell-sub">Not yet received</span>
                      )}
                    </td>
                    <td>
                      <span className="type-tag">
                        {t.type === 'sale' ? <ShoppingCart {...ICON_SM} /> : <ShoppingBag {...ICON_SM} />}
                        {t.type === 'sale' ? 'Sale' : 'Purchase'}
                      </span>
                    </td>
                    <td>{t.party}</td>
                    <td>{formatDate(t.date)}</td>
                    <td className="cell-numeric">{formatCurrency(t.amount)}</td>
                    <td>
                      <span className={badge.className}>{badge.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default RecentTransactions;
