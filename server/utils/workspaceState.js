// utils/workspaceState.js
// Works out where a signed-in user should go next and what their business /
// subscription looks like. Used by login, Google sign-in, sign-up and /me so
// the frontend never has to guess.
//
//   next: 'onboarding' - account exists but the business is not set up yet
//         'renew'      - the business's trial / subscription has run out
//         'dashboard'  - everything is fine (also for old accounts that
//                        pre-date businesses)

const Business = require('../models/Business');

const daysBetween = (from, to) => Math.max(0, Math.ceil((to - from) / 86400000));

async function describeWorkspace(user) {
  const onboardingStatus = user.onboarding?.status || null;

  if (onboardingStatus === 'pending') {
    return {
      next: 'onboarding',
      onboarding: { status: 'pending', step: user.onboarding?.step || 'details' },
      business: null,
      subscription: null,
    };
  }

  if (!user.business) {
    // an account that existed before businesses were introduced
    return { next: 'dashboard', onboarding: null, business: null, subscription: null };
  }

  const business = await Business.findById(user.business);
  if (!business) {
    return { next: 'dashboard', onboarding: null, business: null, subscription: null };
  }

  const now = new Date();
  const status = business.effectiveStatus(now);
  const endsAt =
    status === 'trial' || (status === 'expired' && business.subscription.status === 'trial')
      ? business.subscription.trialEndsAt
      : business.subscription.currentPeriodEnd;

  return {
    next: business.hasAccess(now) ? 'dashboard' : 'renew',
    onboarding: null,
    business: { id: business._id, name: business.name },
    subscription: {
      status,
      planId: business.plan.planId,
      billingCycle: business.plan.billingCycle,
      endsAt: endsAt || null,
      daysLeft: endsAt ? daysBetween(now, endsAt) : null,
      paymentConnected: business.subscription.paymentProvider !== 'none',
    },
  };
}

module.exports = { describeWorkspace };
