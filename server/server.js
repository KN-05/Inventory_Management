// server.js
// This is the entry point of our backend. It:
// 1. Loads environment variables
// 2. Connects to MongoDB
// 3. Sets up Express + middleware (CORS, JSON parsing, logging)
// 4. Registers routes (added in later phases)
// 5. Starts listening for requests

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const validateEnv = require('./config/validateEnv');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Refuse to start with a missing/weak config, then connect to MongoDB
validateEnv();
connectDB();

const app = express();

// Behind a proxy / load balancer (Render, Nginx...) set TRUST_PROXY=1 so
// rate limiting sees each visitor's real IP instead of the proxy's.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

// --- Core middleware ---
// Security headers (no clickjacking/MIME sniffing, etc.). "cross-origin" is
// needed because the frontend lives on another origin and loads the product /
// profile images this server serves from /uploads.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Allow the frontend (running on a different port) to call this API.
// CLIENT_URL may hold several origins separated by commas.
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Parse incoming JSON request bodies into req.body (explicit size cap)
app.use(express.json({ limit: '100kb' }));

// PHASE 2: serve uploaded profile photos as static files, so the
// frontend can display them directly via <img src="http://.../uploads/...">
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log every request to the console (helpful while learning/debugging)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// --- Health check route ---
// A simple route to confirm the API is alive. Useful for Phase 1 testing.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Inventory Management API is running',
  });
});

// --- Feature routes ---
// Generous overall request cap; login / reset / OTP have stricter ones on their routes.
app.use('/api', apiLimiter);
app.use('/api/auth', require('./routes/authRoutes'));
// Business sign-up: onboarding steps, plans and the subscription status
const { plansRouter, subscriptionRouter } = require('./routes/subscriptionRoutes');
app.use('/api/onboarding', require('./routes/onboardingRoutes'));
app.use('/api/plans', plansRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/alerts', require('./routes/stockAlertRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
// PHASE 7: Purchase Orders (create -> receive -> stock auto-increases)
app.use('/api/purchases', require('./routes/purchaseRoutes'));
// PHASE 8: Customers + Sales (checkout -> stock auto-decreases, invoice generated)
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// All planned feature routes are now mounted (Phases 3-9 complete).
//
// The temporary /api/db-test routes (Phase 2-4 helpers used before real
// CRUD screens existed) have been removed now that real Category/Supplier
// management (Phase 5), Dashboard (Phase 6), and Admin Panel (Phase 8)
// cover everything they were standing in for.

// --- Error handling middleware (must be LAST) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
