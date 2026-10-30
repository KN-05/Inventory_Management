// routes/subscriptionRoutes.js
//   GET /api/plans         public - the plans shown on sign-up / renewal
//   GET /api/subscription  signed in - this business's plan + status
const express = require('express');
const { getPlans, getSubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

const plansRouter = express.Router();
plansRouter.get('/', getPlans);

const subscriptionRouter = express.Router();
subscriptionRouter.get('/', protect, getSubscription);

module.exports = { plansRouter, subscriptionRouter };
