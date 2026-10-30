// src/pages/auth/Onboarding.jsx
// "Create your business" steps for a NEW account:
//   1. Business details   2. Choose a plan   3. Review & start
//
// Progress is saved on the server after every step, so someone who closes
// the browser can sign in again and carry on (the page opens on the step they
// reached). Nothing here takes payment: the last step starts a FREE TRIAL and
// says so plainly. The server creates the business and makes this user its
// Admin when "Start free trial" is pressed (once, even if pressed twice).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import {
  getPlans,
  getOnboarding,
  saveBusinessDetails,
  savePlanChoice,
  completeOnboarding,
} from '../../api/onboarding';
import PlanCards from '../../components/auth/PlanCards';
import { planPrice, formatRupees } from '../../utils/plans';

const STEPS = ['Business details', 'Choose a plan', 'Review & start'];
const STEP_INDEX = { details: 0, plan: 1, review: 2 };

const EMPTY = { businessName: '', businessType: '', gstin: '', phone: '', address: '' };

function Onboarding() {
  const { user, startSession, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [planId, setPlanId] = useState('growth');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [trialDays, setTrialDays] = useState(14);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [resumed, setResumed] = useState(false);

  // Load the plans and whatever progress was saved earlier (resume).
  useEffect(() => {
    let cancelled = false;
    Promise.all([getPlans(), getOnboarding()])
      .then(([planData, state]) => {
        if (cancelled) return;
        setPlans(planData.plans);
        setTrialDays(planData.trialDays);
        const o = state.onboarding;
        setForm({
          businessName: o.businessName || '',
          businessType: o.businessType || '',
          gstin: o.gstin || '',
          phone: o.phone || '',
          address: o.address || '',
        });
        if (o.planId) setPlanId(o.planId);
        if (o.billingCycle) setBillingCycle(o.billingCycle);
        const index = STEP_INDEX[o.step] ?? 0;
        setStep(index);
        setResumed(index > 0);
      })
      .catch((err) => !cancelled && setError(err.response?.data?.message || 'Could not load your sign-up progress.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const chosenPlan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateDetails = () => {
    const errors = {};
    if (form.businessName.trim().length < 2) errors.businessName = 'Enter your business name (at least 2 characters).';
    if (form.gstin.trim() && !/^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z]Z[0-9A-Za-z]$/.test(form.gstin.trim())) {
      errors.gstin = 'GSTIN must be 15 characters like 09ABCDE1234F1Z5 (or leave it empty).';
    }
    if (form.phone.trim() && !/^[0-9+\-\s()]{7,20}$/.test(form.phone.trim())) {
      errors.phone = 'Enter a valid phone number.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const run = async (action) => {
    if (busy) return; // blocks double clicks
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitDetails = (e) => {
    e.preventDefault();
    if (!validateDetails()) return;
    run(async () => {
      await saveBusinessDetails({
        businessName: form.businessName.trim(),
        businessType: form.businessType.trim(),
        gstin: form.gstin.trim().toUpperCase(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      setStep(1);
    });
  };

  const submitPlan = () =>
    run(async () => {
      await savePlanChoice(planId, billingCycle);
      setStep(2);
    });

  const startTrial = () =>
    run(async () => {
      const data = await completeOnboarding();
      startSession(data, true); // new token: this person is now the Admin
      navigate('/dashboard', { replace: true });
    });

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>;

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

        <ol className="onb-steps" aria-label="Sign-up progress">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="onb-step-num">{i < step ? '\u2713' : i + 1}</span>
              <span className="onb-step-label">{label}</span>
            </li>
          ))}
        </ol>

        {resumed && step > 0 && (
          <p className="onb-note onb-note--info" role="status">
            Welcome back - we saved your progress. Pick up where you left off.
          </p>
        )}
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        {step === 0 && (
          <form className="onb-card" onSubmit={submitDetails} noValidate>
            <h1 className="onb-title">Tell us about your business</h1>
            <p className="onb-sub">Hello {user?.name?.split(' ')[0] || 'there'}! This appears on your invoices and reports.</p>

            <div className="login-field">
              <label htmlFor="onb-name">Business name *</label>
              <input
                id="onb-name"
                className={`login-input${fieldErrors.businessName ? ' input-invalid' : ''}`}
                value={form.businessName}
                onChange={setField('businessName')}
                maxLength={80}
                autoFocus
                placeholder="e.g. Sharma Electronics"
                aria-invalid={fieldErrors.businessName ? 'true' : undefined}
              />
              {fieldErrors.businessName && <span className="field-error">{fieldErrors.businessName}</span>}
            </div>

            <div className="onb-row">
              <div className="login-field">
                <label htmlFor="onb-type">Type of business</label>
                <input id="onb-type" className="login-input" value={form.businessType} onChange={setField('businessType')} maxLength={60} placeholder="Retail, wholesale..." />
              </div>
              <div className="login-field">
                <label htmlFor="onb-phone">Phone</label>
                <input
                  id="onb-phone"
                  className={`login-input${fieldErrors.phone ? ' input-invalid' : ''}`}
                  value={form.phone}
                  onChange={setField('phone')}
                  maxLength={20}
                  inputMode="tel"
                  placeholder="98765 43210"
                />
                {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="onb-gstin">GSTIN (optional)</label>
              <input
                id="onb-gstin"
                className={`login-input${fieldErrors.gstin ? ' input-invalid' : ''}`}
                value={form.gstin}
                onChange={setField('gstin')}
                maxLength={15}
                placeholder="09ABCDE1234F1Z5"
              />
              {fieldErrors.gstin && <span className="field-error">{fieldErrors.gstin}</span>}
            </div>

            <div className="login-field">
              <label htmlFor="onb-address">Address (optional)</label>
              <input id="onb-address" className="login-input" value={form.address} onChange={setField('address')} maxLength={200} placeholder="Shop address" />
            </div>

            <div className="onb-actions onb-actions--end">
              <button type="submit" className="login-submit-btn onb-btn" disabled={busy}>
                {busy ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <section className="onb-card onb-card--wide">
            <h1 className="onb-title">Choose your plan</h1>
            <p className="onb-sub">
              Every plan starts with a free {trialDays}-day trial. You can change plans later.
            </p>
            <PlanCards plans={plans} planId={planId} onPlanChange={setPlanId} billingCycle={billingCycle} onCycleChange={setBillingCycle} />
            <div className="onb-actions">
              <button type="button" className="auth-back-btn" onClick={() => setStep(0)} disabled={busy}>
                Back
              </button>
              <button type="button" className="login-submit-btn onb-btn" onClick={submitPlan} disabled={busy}>
                {busy ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </section>
        )}

        {step === 2 && chosenPlan && (
          <section className="onb-card">
            <h1 className="onb-title">Review and start</h1>
            <dl className="onb-summary">
              <div>
                <dt>Business</dt>
                <dd>{form.businessName}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>
                  {chosenPlan.name} ({billingCycle})
                </dd>
              </div>
              <div>
                <dt>Price after the trial</dt>
                <dd>
                  {formatRupees(planPrice(chosenPlan, billingCycle))} / {billingCycle === 'yearly' ? 'year' : 'month'}
                </dd>
              </div>
              <div>
                <dt>You pay today</dt>
                <dd>
                  <strong>{formatRupees(0)}</strong>
                </dd>
              </div>
            </dl>

            <p className="onb-note" role="note">
              <strong>Online payment is not connected yet.</strong> You will not be charged. Pressing the button below
              starts your free {trialDays}-day trial and makes you the Admin of <em>{form.businessName}</em>.
            </p>

            <div className="onb-actions">
              <button type="button" className="auth-back-btn" onClick={() => setStep(1)} disabled={busy}>
                Back
              </button>
              <button type="button" className="login-submit-btn onb-btn" onClick={startTrial} disabled={busy}>
                {busy ? 'Setting up your business...' : `Start free ${trialDays}-day trial`}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default Onboarding;
