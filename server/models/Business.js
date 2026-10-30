// models/Business.js
// One customer business (a "workspace"). Created when a new user finishes
// onboarding; that user becomes the Admin of it. All inventory data is tied to
// a business through the `business` field added by plugins/tenantScope.js.
//
// PAYMENT: no payment gateway is connected. A new business starts a free
// trial (see config/plans.js). `subscription.paymentProvider` stays 'none'
// until a real gateway is integrated.

const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      minlength: [2, 'Business name must be at least 2 characters'],
      maxlength: [80, 'Business name must be at most 80 characters'],
    },
    // The user who created it. unique => one user can never create two
    // businesses (a retry or double click finds the existing one instead).
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessType: { type: String, trim: true, default: '', maxlength: 60 },
    gstin: { type: String, trim: true, uppercase: true, default: '', maxlength: 15 },
    phone: { type: String, trim: true, default: '', maxlength: 20 },
    address: { type: String, trim: true, default: '', maxlength: 200 },
    plan: {
      planId: { type: String, enum: ['starter', 'growth', 'pro'], required: true },
      billingCycle: { type: String, enum: ['monthly', 'yearly'], required: true },
    },
    subscription: {
      status: {
        type: String,
        enum: ['trial', 'active', 'expired', 'cancelled'],
        default: 'trial',
      },
      trialEndsAt: { type: Date, default: null },
      currentPeriodEnd: { type: Date, default: null },
      paymentProvider: { type: String, default: 'none' },
    },
  },
  { timestamps: true }
);

// The status that matters RIGHT NOW. A trial or paid period that has run out
// counts as expired even if nobody has updated the stored status yet.
businessSchema.methods.effectiveStatus = function effectiveStatus(now = new Date()) {
  const sub = this.subscription || {};
  if (sub.status === 'trial') {
    return sub.trialEndsAt && sub.trialEndsAt < now ? 'expired' : 'trial';
  }
  if (sub.status === 'active') {
    return sub.currentPeriodEnd && sub.currentPeriodEnd < now ? 'expired' : 'active';
  }
  return sub.status;
};

businessSchema.methods.hasAccess = function hasAccess(now = new Date()) {
  return ['trial', 'active'].includes(this.effectiveStatus(now));
};

module.exports = mongoose.model('Business', businessSchema);
