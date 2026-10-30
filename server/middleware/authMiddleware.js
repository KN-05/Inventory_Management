// middleware/authMiddleware.js
// "protect" runs on any route that requires the user to be logged in.
// It reads the JWT from the Authorization header, verifies it, then looks
// up the user in the database and attaches it to req.user so later
// middleware/controllers know who is making the request.

const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Business = require('../models/Business');
const { runInTenant } = require('../utils/tenantContext');

// Is this request under one of these API prefixes? (req.baseUrl is the mount
// path of the router the request came through, e.g. "/api/products".)
const underPrefix = (req, prefixes) =>
  prefixes.some((p) => req.baseUrl === p || (req.baseUrl || '').startsWith(`${p}/`));

const blocked = (res, status, appCode, message) => {
  res.status(status);
  const err = new Error(message);
  err.appCode = appCode;
  return err;
};

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Expected header format: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }

  // Fetch the user fresh from the DB (not just trusting the token payload)
  // so we catch cases like the account being deactivated after the token
  // was issued.
  const user = await User.findById(decoded.id);

  if (!user) {
    res.status(401);
    throw new Error('Not authorized, user no longer exists');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated. Contact an administrator.');
  }

  // --- New-business sign-up not finished: only the onboarding screens work ---
  if (user.onboarding?.status === 'pending' && !underPrefix(req, ['/api/auth', '/api/plans', '/api/onboarding'])) {
    throw blocked(res, 403, 'ONBOARDING_REQUIRED', 'Finish setting up your business to continue.');
  }

  // --- Business subscription / trial ran out: data is kept, access is paused ---
  const business = user.business ? await Business.findById(user.business) : null;
  if (business && !business.hasAccess() && !underPrefix(req, ['/api/auth', '/api/plans', '/api/subscription'])) {
    throw blocked(
      res,
      402,
      'SUBSCRIPTION_EXPIRED',
      'Your subscription has expired. Renew to continue - your data is safe.'
    );
  }

  req.user = user; // available to every controller/middleware after this point
  req.business = business;

  // From here on, every database query made for this request is limited to
  // the user's own business (see utils/tenantContext.js).
  return runInTenant(user.business, () => next());
});

module.exports = { protect };
