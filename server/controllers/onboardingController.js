// controllers/onboardingController.js
// The "create your business" steps for a new account:
//   details -> plan -> review -> complete
// Progress is stored on the user (user.onboarding), so someone who closes the
// browser can sign in again and carry on where they stopped.
//
// PAYMENT: no payment is taken or simulated. Completing onboarding creates the
// business with a free trial of the chosen plan (config/plans.js). Nothing in
// the response claims that a payment happened.

const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const logActivity = require('../utils/logActivity');
const User = require('../models/User');
const Business = require('../models/Business');
const formatUser = require('../utils/formatUser');
const { describeWorkspace } = require('../utils/workspaceState');
const { TRIAL_DAYS } = require('../config/plans');

const requirePending = (req, res) => {
  if (req.user.onboarding?.status !== 'pending') {
    res.status(400);
    throw new Error('Your business is already set up.');
  }
};

const onboardingView = (user) => {
  const o = user.onboarding || {};
  return {
    status: o.status || null,
    step: o.step || null,
    businessName: o.businessName || '',
    businessType: o.businessType || '',
    gstin: o.gstin || '',
    phone: o.phone || '',
    address: o.address || '',
    planId: o.planId || null,
    billingCycle: o.billingCycle || null,
  };
};

// @route GET /api/onboarding
const getOnboarding = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, onboarding: onboardingView(req.user), name: req.user.name });
});

// @route PUT /api/onboarding/details
const saveDetails = asyncHandler(async (req, res) => {
  requirePending(req, res);
  const { businessName, businessType = '', gstin = '', phone = '', address = '' } = req.body;
  const nextStep = req.user.onboarding.step === 'details' ? 'plan' : req.user.onboarding.step;

  await User.updateOne(
    { _id: req.user._id, 'onboarding.status': 'pending' },
    {
      $set: {
        'onboarding.businessName': businessName,
        'onboarding.businessType': businessType,
        'onboarding.gstin': gstin,
        'onboarding.phone': phone,
        'onboarding.address': address,
        'onboarding.step': nextStep,
      },
    }
  );
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, onboarding: onboardingView(user) });
});

// @route PUT /api/onboarding/plan
const savePlan = asyncHandler(async (req, res) => {
  requirePending(req, res);
  if (!req.user.onboarding.businessName) {
    res.status(400);
    throw new Error('Enter your business details first.');
  }
  const { planId, billingCycle } = req.body;
  await User.updateOne(
    { _id: req.user._id, 'onboarding.status': 'pending' },
    { $set: { 'onboarding.planId': planId, 'onboarding.billingCycle': billingCycle, 'onboarding.step': 'review' } }
  );
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, onboarding: onboardingView(user) });
});

// @route POST /api/onboarding/complete
// Idempotent: pressing the button twice, a retry, or two tabs all end with
// exactly ONE business and ONE admin (Business.owner is unique).
const completeOnboarding = asyncHandler(async (req, res) => {
  const existing = await Business.findOne({ owner: req.user._id });
  const o = req.user.onboarding || {};

  if (!existing) {
    if (o.status !== 'pending') {
      res.status(400);
      throw new Error('There is nothing to complete.');
    }
    if (!o.businessName || !o.planId || !o.billingCycle) {
      res.status(400);
      throw new Error('Enter your business details and choose a plan first.');
    }
  }

  let business = existing;
  let created = false;
  if (!business) {
    try {
      business = await Business.create({
        name: o.businessName,
        owner: req.user._id,
        businessType: o.businessType || '',
        gstin: o.gstin || '',
        phone: o.phone || '',
        address: o.address || '',
        plan: { planId: o.planId, billingCycle: o.billingCycle },
        subscription: {
          status: 'trial',
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000),
          paymentProvider: 'none',
        },
      });
      created = true;
    } catch (err) {
      if (err.code !== 11000) throw err;
      business = await Business.findOne({ owner: req.user._id }); // a parallel request created it
    }
  }

  // The user becomes Admin of THEIR OWN business (never of anyone else's).
  await User.updateOne(
    { _id: req.user._id, business: null },
    { $set: { business: business._id, role: 'admin', 'onboarding.status': 'complete', 'onboarding.step': 'done' } }
  );
  if (created) await logActivity(req.user._id, `Created business "${business.name}"`, 'auth');

  // Reflect the change on the in-memory user for this response (the request's
  // tenant context was fixed before the business existed, so re-reading the
  // user through the normal scoped query would not find it).
  const refreshed = req.user;
  refreshed.role = 'admin';
  refreshed.business = business._id;
  refreshed.onboarding.status = 'complete';
  refreshed.onboarding.step = 'done';

  const workspace = await describeWorkspace(refreshed);
  res.status(created ? 201 : 200).json({
    success: true,
    message: created ? 'Your business is ready.' : 'Your business was already set up.',
    // a new token, because the role changed from staff to admin
    token: generateToken(req.user._id, 'admin'),
    user: formatUser(refreshed),
    workspace,
    next: workspace.next,
  });
});

module.exports = { getOnboarding, saveDetails, savePlan, completeOnboarding };
