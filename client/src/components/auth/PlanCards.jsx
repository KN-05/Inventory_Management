// src/components/auth/PlanCards.jsx
// The plan picker used by the sign-up (onboarding) page and the renewal page:
// a Monthly / Yearly switch and one card per plan. The plans themselves come
// from the server (GET /api/plans), so prices are defined in ONE place.
//
// It only SELECTS a plan. No payment happens here.

import { planPrice, formatRupees } from '../../utils/plans';

function PlanCards({ plans, planId, onPlanChange, billingCycle, onCycleChange, readOnly = false }) {
  return (
    <div className="plans">
      <div className="plans-toggle" role="radiogroup" aria-label="Billing period">
        {['monthly', 'yearly'].map((cycle) => (
          <button
            key={cycle}
            type="button"
            role="radio"
            aria-checked={billingCycle === cycle}
            className={billingCycle === cycle ? 'is-active' : ''}
            onClick={() => onCycleChange(cycle)}
          >
            {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
            {cycle === 'yearly' && <span className="plans-save">2 months free</span>}
          </button>
        ))}
      </div>

      <div className="plans-grid" role="radiogroup" aria-label="Plans">
        {plans.map((plan) => {
          const selected = plan.id === planId;
          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={readOnly}
              className={`plan-card${selected ? ' is-selected' : ''}${plan.popular ? ' is-popular' : ''}`}
              onClick={() => onPlanChange(plan.id)}
            >
              {plan.popular && <span className="plan-badge">Most popular</span>}
              <span className="plan-name">{plan.name}</span>
              <span className="plan-tagline">{plan.tagline}</span>
              <span className="plan-price">
                {formatRupees(planPrice(plan, billingCycle))}
                <small>/{billingCycle === 'yearly' ? 'year' : 'month'}</small>
              </span>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <span className="plan-select" aria-hidden="true">
                {selected ? 'Selected' : 'Select'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PlanCards;
