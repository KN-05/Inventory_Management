// config/permissions.js
// PHASE 2: explicit, granular permissions - not just role names. The
// project spec is explicit about this:
//   "Do not implement permissions only using frontend hiding. Permissions
//    MUST also be enforced in backend middleware/API authorization."
//
// Each permission is a "resource.action" string, e.g. 'products.create'.
// ROLE_PERMISSIONS maps each role to the list of permissions it has.
// The 100%/75%/50% figures in the spec are only a rough conceptual
// description - this file is the actual source of truth enforced by
// middleware/roleMiddleware.js's requirePermission().
//
// Only permissions for modules that currently exist are listed. Later
// phases (Purchases, Sales, Invoices, Payments, etc.) will add their own
// permission entries here when those modules are built - this file is
// meant to grow alongside the app, not be finished all at once.

const PERMISSIONS = {
  // Users / roles - Admin only, per the spec ("Only Admin can create
  // Accountant/Manager and Staff accounts", "Not allowed: Create Admin,
  // Delete Admin, Change Admin role, Full user/role management" for Manager)
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_VIEW: 'users.view',

  // Products
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',

  // Categories
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',

  // Suppliers
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_UPDATE: 'suppliers.update',
  SUPPLIERS_DELETE: 'suppliers.delete',

  // Inventory / stock
  INVENTORY_UPDATE: 'inventory.update',

  // Reports & analytics
  REPORTS_VIEW: 'reports.view',
  ANALYTICS_VIEW: 'analytics.view',

  // Bulk import
  IMPORTS_CREATE: 'imports.create',

  // PHASE 7: Purchases (Purchase Orders). Not granted to Staff - the
  // spec's Staff "Allowed" list doesn't include Purchases at all.
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_UPDATE: 'purchases.update',
  PURCHASES_DELETE: 'purchases.delete',
  PURCHASES_RECEIVE: 'purchases.receive',
};

// Admin: everything.
const ADMIN_PERMISSIONS = Object.values(PERMISSIONS);

// Manager/Accountant (~75% per spec): full operational + inventory +
// reporting access, but NOT user/role management (that stays Admin-only).
const MANAGER_PERMISSIONS = [
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.PRODUCTS_CREATE,
  PERMISSIONS.PRODUCTS_UPDATE,
  PERMISSIONS.PRODUCTS_DELETE,
  PERMISSIONS.CATEGORIES_VIEW,
  PERMISSIONS.CATEGORIES_CREATE,
  PERMISSIONS.CATEGORIES_UPDATE,
  PERMISSIONS.CATEGORIES_DELETE,
  PERMISSIONS.SUPPLIERS_VIEW,
  PERMISSIONS.SUPPLIERS_CREATE,
  PERMISSIONS.SUPPLIERS_UPDATE,
  PERMISSIONS.SUPPLIERS_DELETE,
  PERMISSIONS.INVENTORY_UPDATE,
  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.ANALYTICS_VIEW,
  PERMISSIONS.IMPORTS_CREATE,
  // PHASE 7: full purchase workflow for Manager, per the spec ("Focus
  // heavily on: inventory, purchases, sales, billing, payments...").
  // PURCHASES_DELETE is intentionally NOT granted here - deleting a
  // purchase order is kept Admin-only (see purchaseRoutes.js's
  // `authorize('admin')` on that route), since it's a financial
  // document, unlike Product/Category delete which Manager does get.
  PERMISSIONS.PURCHASES_VIEW,
  PERMISSIONS.PURCHASES_CREATE,
  PERMISSIONS.PURCHASES_UPDATE,
  PERMISSIONS.PURCHASES_RECEIVE,
];

// Staff (~50% per spec): simplified, operational-only. Can view and do
// basic stock work, but not delete records, manage suppliers/categories,
// or see reports/analytics/imports.
const STAFF_PERMISSIONS = [
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.PRODUCTS_CREATE,
  PERMISSIONS.PRODUCTS_UPDATE,
  PERMISSIONS.CATEGORIES_VIEW,
  PERMISSIONS.SUPPLIERS_VIEW,
  PERMISSIONS.INVENTORY_UPDATE,
];

const ROLE_PERMISSIONS = {
  admin: ADMIN_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  staff: STAFF_PERMISSIONS,
};

// True/false check used by the requirePermission middleware.
function roleHasPermission(role, permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

module.exports = { PERMISSIONS, ROLE_PERMISSIONS, roleHasPermission };
