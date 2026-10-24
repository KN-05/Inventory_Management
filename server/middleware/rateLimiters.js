// middleware/rateLimiters.js
// Request limits that slow down password guessing and abuse.
//
// Counters live in this server process's memory: they reset when the server
// restarts and are NOT shared if you run several server instances. That is
// fine for a single server; with several instances, switch to a shared store
// (e.g. rate-limit-redis).
//
// Behind a proxy / load balancer (Render, Nginx, Heroku...) set TRUST_PROXY=1
// in .env, otherwise every user looks like the same IP address.

const rateLimit = require('express-rate-limit');

const disabled = process.env.RATE_LIMIT_DISABLED === 'true' || process.env.NODE_ENV === 'test';

// Same JSON shape as every other error the API returns.
function limiter({ windowMs, limit, message, keyGenerator, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7', // sends RateLimit-* headers so clients can see the limit
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: () => disabled,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (req, res) => {
      res.status(429).json({ success: false, message });
    },
  });
}

// Login: 10 FAILED attempts per 15 minutes per IP. Successful logins are not
// counted, so a normal user is never locked out by their own correct logins.
const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many failed login attempts. Please wait 15 minutes and try again.',
});

// Forgot / reset password (sends emails, accepts tokens): 5 per hour per IP.
const passwordResetLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Too many password reset requests. Please try again in an hour.',
});

// Staff-password OTP (request + confirm): 6 per 10 minutes per IP.
const otpLimiter = limiter({
  windowMs: 10 * 60 * 1000,
  limit: 6,
  message: 'Too many verification attempts. Please wait 10 minutes and try again.',
});

// Safety net for the whole API. Generous on purpose (a dashboard load makes
// ~10 requests); it only stops scripts hammering the server. Override with
// API_RATE_LIMIT in .env.
const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT) || 1500,
  message: 'Too many requests. Please slow down and try again shortly.',
});

module.exports = { loginLimiter, passwordResetLimiter, otpLimiter, apiLimiter };
