// middleware/validateMiddleware.js
// A small reusable helper for input validation.
//
// How it's used (example, added in Phase 3):
//   const { body } = require('express-validator');
//   router.post(
//     '/register',
//     [body('email').isEmail(), body('password').isLength({ min: 6 })],
//     validateRequest,   // <-- this middleware
//     registerUser
//   );
//
// express-validator's checks (body(), etc.) collect errors onto the
// request. This middleware checks if any errors were collected and, if so,
// stops the request with a 400 response BEFORE it reaches the controller.

const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  next();
};

module.exports = validateRequest;
