// src/pages/auth/Renew.jsx
// Shown when a business's free trial or subscription has ended. The business's
// data is NOT deleted - access is only paused. This page shows what happened,
// the plans, and why the "Renew" button is not usable yet.
//
// PAYMENT: no gateway is connected, so there is nothing real to press. The
// button is disabled and says so. Until payment exists, the platform owner
// extends a business by hand (server/scripts/setSubscription.js).

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { getPlans } from '../../api/onboarding';
import PlanCards from '../../components/auth/PlanCards';
import { planPrice, formatRupees } from '../../utils/plans';

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

function Renew() {
  const { user, workspace, refreshWorkspace, logout } = useAuth();
  const navigate = useNavigate();

  const subscription = workspace?.subscription;
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState(subscription?.planId || 'growth');
  const [billingCycle, setBillingCycle] = useState(subscription?.billingCycle || 'monthly');
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getPlans()
      .then((data) => setPlans(data.plans))
      .catch(() => setMessage('Could not load the plans. Please refresh the page.'));
  }, []);

  const isAdmin = user?.role === 'admin';
  const chosen = plans.find((p) => p.id === planId);

  // Re-read the account: if the owner has extended the business, we go in.
  const checkAgain = async () => {
    if (checking) return;
    setChecking(true);
    setMessage('');
    try {
      const data = await refreshWorkspace();
      if (data.next === 'dashboard') {
        navigate('/dashboard', { replace: true });
      } else {
        setMessage('Your access has not been renewed yet.');
      }
    } catch {
      setMessage('Could not check your subscription. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="onb-page">
      <div className="onb-shell">
        <header className="onb-header">
          <div className="login-brand">
            <span className="login-brand-icon">IM</span>
            <span className="login-brand-text">Inventory Manager</span>
          </div>
          <div className="onb-user">
            <span>{user?.email}</span>
            <button type="button" className="auth-link-btn" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>

        <section className="onb-card onb-card--wide">
          <span className="renew-badge">Subscription ended</span>
          <h1 className="onb-title">
            {workspace?.business?.name ? `${workspace.business.name}: ` : ''}your access is paused
          </h1>
          <p className="onb-sub">
            {subscription?.endsAt ? `Your plan ended on ${formatDate(subscription.endsAt)}. ` : ''}
            <strong>Nothing has been deleted</strong> - your products, sales and reports are safe and will be there as soon
            as you renew.
          </p>

          {!isAdmin && (
            <p className="onb-note onb-note--info" role="note">
              Only your business Admin can renew the subscription. Please ask them to renew.
            </p>
          )}

          {isAdmin && plans.length > 0 && (
            <>
              <PlanCards
                plans={plans}
                planId={planId}
                onPlanChange={setPlanId}
                billingCycle={billingCycle}
                onCycleChange={setBillingCycle}
              />
              <p className="onb-note" role="note">
                <strong>Online payment is not connected yet</strong>, so a plan cannot be bought from this page. To renew{' '}
                {chosen ? `${chosen.name} (${formatRupees(planPrice(chosen, billingCycle))}/${billingCycle === 'yearly' ? 'year' : 'month'})` : ''},
                contact the platform owner - they can extend your access.
              </p>
            </>
          )}

          {message && (
            <p className="login-error" role="alert">
              {message}
            </p>
          )}

          <div className="onb-actions">
            <button type="button" className="auth-back-btn" onClick={checkAgain} disabled={checking}>
              {checking ? 'Checking...' : 'I have renewed - check again'}
            </button>
            {isAdmin && (
              <button type="button" className="login-submit-btn onb-btn" disabled title="Online payment is not connected yet">
                Pay and renew (not available yet)
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Renew;
