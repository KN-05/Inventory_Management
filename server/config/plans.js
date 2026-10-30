// config/plans.js
// Subscription plans shown on the onboarding and renewal pages.
//
// PAYMENT IS NOT CONNECTED: choosing a plan only records the choice and starts
// a free trial. The listed staff-account / feature differences are for display
// and are NOT enforced by the server yet.

const TRIAL_DAYS = Number(process.env.TRIAL_DAYS) || 14;

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For a single small shop',
    monthly: 499,
    yearly: 4990,
    features: [
      'Products, categories and suppliers',
      'Sales and GST billing',
      'Stock alerts',
      'Up to 3 staff accounts',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For a growing business',
    monthly: 999,
    yearly: 9990,
    popular: true,
    features: [
      'Everything in Starter',
      'Purchases and supplier orders',
      'Reports and analytics',
      'CSV import and export',
      'Up to 10 staff accounts',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For multi-counter stores',
    monthly: 1999,
    yearly: 19990,
    features: [
      'Everything in Growth',
      'AI stock insights',
      'Attendance tracking',
      'Unlimited staff accounts',
      'Priority support',
    ],
  },
];

const PLAN_IDS = PLANS.map((p) => p.id);
const BILLING_CYCLES = ['monthly', 'yearly'];

module.exports = { PLANS, PLAN_IDS, BILLING_CYCLES, TRIAL_DAYS };
