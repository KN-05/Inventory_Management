// middleware/validateMiddleware.js
// A small reusable helper for input validation.
//
// BUGFIX (real-world report): passing an array of express-validator
// chains directly as separate Express middleware arguments -
//   router.post('/', [body('email').isEmail(), ...], validateRequest, controller)
// - relies on Express to automatically advance through each array
// item's own internal Promise, then call the next middleware
// (validateRequest) in sequence. On this project's Express version this
// combination intermittently produced "TypeError: next is not a
// function" on every create/update request across multiple resources
// (Products, Categories, Suppliers) - Express's automatic promise-to-
// next() handling for an ARRAY of validator middleware turned out to be
// the fragile part.
//
// The fix: don't hand Express an array of validator middleware at all.
// `runValidation(rules)` wraps everything - running every rule AND
// checking the result - inside ONE explicit async function that Express
// only ever has to call with a real, single (req, res, next) it
// provides directly. There is no longer an array of separate validator
// middleware for Express to auto-sequence, so there's nothing left for
// that behavior to go wrong on.
//
// How it's used (updated pattern, all routes now use this):
//   const { runValidation } = require('../middleware/validateMiddleware');
//   router.post(
//     '/register',
//     runValidation([body('email').isEmail(), body('password').isLength({ min: 6 })]),
//     registerUser
//   );

const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');

function runValidation(rules) {
  return asyncHandler(async (req, res, next) => {
    // Run every validation chain explicitly ourselves, awaiting all of
    // them, instead of letting Express iterate the array on its own.
    for (const rule of rules) {
      // eslint-disable-next-line no-await-in-loop
      await rule.run(req);
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
      return; // don't call next() - the response is already sent
    }

    next();
  });
}

module.exports = { runValidation };
