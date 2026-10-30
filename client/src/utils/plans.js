// src/utils/plans.js - small helpers shared by the sign-up and renewal pages.

export const planPrice = (plan, cycle) => (cycle === 'yearly' ? plan.yearly : plan.monthly);

export const formatRupees = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
