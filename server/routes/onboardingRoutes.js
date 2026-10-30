// routes/onboardingRoutes.js - mounted at /api/onboarding
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { getOnboarding, saveDetails, savePlan, completeOnboarding } = require('../controllers/onboardingController');
const { runValidation } = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { PLAN_IDS, BILLING_CYCLES } = require('../config/plans');

router.use(protect);

router.get('/', getOnboarding);

router.put(
  '/details',
  runValidation([
    body('businessName')
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('Business name must be 2 to 80 characters'),
    body('businessType').optional({ values: 'falsy' }).trim().isLength({ max: 60 }).withMessage('Business type is too long'),
    body('gstin')
      .optional({ values: 'falsy' })
      .trim()
      .toUpperCase()
      .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)
      .withMessage('GSTIN must be a valid 15-character GST number (or leave it empty)'),
    body('phone')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^[0-9+\-\s()]{7,20}$/)
      .withMessage('Enter a valid phone number'),
    body('address').optional({ values: 'falsy' }).trim().isLength({ max: 200 }).withMessage('Address is too long'),
  ]),
  saveDetails
);

router.put(
  '/plan',
  runValidation([
    body('planId').isIn(PLAN_IDS).withMessage('Choose a valid plan'),
    body('billingCycle').isIn(BILLING_CYCLES).withMessage('Choose monthly or yearly billing'),
  ]),
  savePlan
);

router.post('/complete', completeOnboarding);

module.exports = router;
