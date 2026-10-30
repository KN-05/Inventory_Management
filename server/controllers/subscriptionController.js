// controllers/subscriptionController.js
const asyncHandler = require('../utils/asyncHandler');
const { PLANS, TRIAL_DAYS } = require('../config/plans');
const { describeWorkspace } = require('../utils/workspaceState');

// @route GET /api/plans   (public)
const getPlans = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    plans: PLANS,
    trialDays: TRIAL_DAYS,
    // The UI shows this so nobody is led to believe a payment can be made.
    paymentConnected: false,
    note: 'Online payment is not connected yet. Choosing a plan starts a free trial.',
  });
});

// @route GET /api/subscription   (signed in; works even when expired)
const getSubscription = asyncHandler(async (req, res) => {
  const workspace = await describeWorkspace(req.user);
  res.status(200).json({ success: true, ...workspace, paymentConnected: false });
});

module.exports = { getPlans, getSubscription };
