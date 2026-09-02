// middleware/authMiddleware.js
// "protect" runs on any route that requires the user to be logged in.
// It reads the JWT from the Authorization header, verifies it, then looks
// up the user in the database and attaches it to req.user so later
// middleware/controllers know who is making the request.

const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

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

  req.user = user; // available to every controller/middleware after this point
  next();
});

module.exports = { protect };
