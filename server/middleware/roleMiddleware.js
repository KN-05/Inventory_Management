// middleware/roleMiddleware.js
// Two middleware factories here:
//
// 1. authorize(...roles) - simple role-name check (e.g. 'admin' only).
//    Still used where a route is genuinely role-specific rather than
//    permission-specific (e.g. Admin-only user management).
//
// 2. requirePermission(permission) - PHASE 2: checks a granular permission
//    string (from config/permissions.js) against the logged-in user's
//    role, instead of hardcoding role names into every route. This is
//    what the project spec asks for: "Use explicit permissions such as
//    products.create, products.update... Permissions MUST also be
//    enforced in backend middleware/API authorization."
//
// Usage (always AFTER `protect`, since both rely on req.user):
//   router.delete('/:id', protect, authorize('admin'), deleteProduct);
//   router.delete('/:id', protect, requirePermission(PERMISSIONS.PRODUCTS_DELETE), deleteProduct);

const { roleHasPermission } = require('../config/permissions');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized, no user found on request');
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user.role}' is not permitted to perform this action`);
    }

    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized, no user found on request');
    }

    if (!roleHasPermission(req.user.role, permission)) {
      res.status(403);
      throw new Error(`Your role does not have permission to perform this action (${permission})`);
    }

    next();
  };
};

module.exports = { authorize, requirePermission };
