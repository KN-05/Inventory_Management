// server.js

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

// Validate environment and connect database
validateEnv();
connectDB();

const app = express();

// Trust proxy
if (process.env.TRUST_PROXY) {
  app.set(
    'trust proxy',
    Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY
  );
}

// --- CORS CONFIGURATION ---

const allowedOrigins = [
  'https://mellifluous-belekoy-45f38a.netlify.app',
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (health checks, server tools).
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS: ' + origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// --- SECURITY MIDDLEWARE ---

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

// Parse JSON
app.use(express.json({ limit: '100kb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// --- HEALTH CHECK ---

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Inventory Management API is running',
  });
});

// --- API ROUTES ---

app.use('/api', apiLimiter);

app.use('/api/auth', require('./routes/authRoutes'));

const {
  plansRouter,
  subscriptionRouter,
} = require('./routes/subscriptionRoutes');

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

app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// --- ERROR HANDLING ---

app.use(notFound);
app.use(errorHandler);

// --- START SERVER ---

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});