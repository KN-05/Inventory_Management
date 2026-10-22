// utils/generateToken.js
// Creates a signed JWT containing the user's id and role.
// We keep the payload small - only what's needed to identify the user
// and check permissions. Never put sensitive data (like a password) in a JWT,
// since the payload can be decoded by anyone (it's signed, not encrypted).

const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = generateToken;
