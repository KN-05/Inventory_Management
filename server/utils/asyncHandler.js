// utils/asyncHandler.js
// Express doesn't automatically catch errors thrown inside async functions.
// Wrapping every controller in try/catch gets repetitive, so this helper
// does it once. Any error inside an async controller is passed to
// next(error), which our errorHandler middleware then formats nicely.
//
// Usage:
//   const asyncHandler = require('../utils/asyncHandler');
//   exports.getProducts = asyncHandler(async (req, res) => { ... });

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
