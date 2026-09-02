// middleware/errorMiddleware.js
// Two middlewares here:
// 1. notFound - runs when NO route matched the request (404)
// 2. errorHandler - catches any error thrown/passed with next(err) anywhere in the app

const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error); // pass it along to errorHandler
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // If a route already set a status code (e.g. 400/401/404), keep it.
  // Otherwise default to 500 (server error).
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // PHASE 11 FIX: without this, three common Mongoose/MongoDB errors were
  // slipping through as raw 500s with confusing internal messages instead
  // of clean, expected responses:

  // 1. CastError - happens when an :id in the URL isn't a valid MongoDB
  //    ObjectId (e.g. GET /api/products/not-a-real-id). Previously this
  //    produced a 500 with a scary "Cast to ObjectId failed..." message.
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // 2. ValidationError - Mongoose's own schema validation (separate from
  //    the express-validator checks on routes) rejecting a save. Combine
  //    all field errors into one readable message.
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // 3. Duplicate key error - a unique index (email, sku, category name...)
  //    was violated. This can happen even after our manual "already
  //    exists" checks in a rare race condition (two requests at once).
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field} - it must be unique`;
  }

  // 4. Multer errors (PHASE 13, CSV import) - bad file type from our
  //    fileFilter, or the file exceeding the 2MB limit. Without this,
  //    these also fell through to a raw 500.
  if (err.name === 'MulterError' || err.message === 'Only .csv files are allowed') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 2MB)' : err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Only show the stack trace during development, never in production.
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
