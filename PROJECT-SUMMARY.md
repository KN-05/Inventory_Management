# Inventory Management System — Project Summary

_Generated at the end of Phase 14 (Final Polish) - the project's final phase._

This document is the single reference for everything the system does today,
how it's organized, and what's intentionally left for the future. For the
full route-by-route API reference, see `docs/API.md`.

---

## 1. Final Folder Structure

```
inventory-management/
├── README.md                 Setup instructions (start here to run the app)
├── docs/
│   └── API.md                 Full API route reference
├── server/                    Node.js + Express + MongoDB backend
│   ├── config/
│   │   ├── db.js                 MongoDB connection
│   │   └── permissions.js        The single source of truth for role -> permission mapping
│   ├── controllers/               One file per resource (business logic)
│   ├── middleware/
│   │   ├── authMiddleware.js       protect (JWT verification)
│   │   ├── roleMiddleware.js       authorize() + requirePermission()
│   │   ├── validateMiddleware.js   express-validator error formatting
│   │   └── errorMiddleware.js      404 handler + global error handler
│   ├── models/                    One Mongoose schema per collection (see §5)
│   ├── routes/                    One Express router per resource
│   ├── uploads/                   Product/category/profile photos (gitignored)
│   ├── utils/                     SKU/barcode/invoice/PO-number generators, CSV builder,
│   │                              JWT signing, activity logging, notifications
│   └── server.js                  App entry point - mounts every router
└── client/                    React + Vite frontend
    ├── src/
    │   ├── api/                    One file per resource - thin axios wrappers, nothing else
    │   ├── components/
    │   │   ├── common/               Button, modal, confirm dialog, loaders, route guards
    │   │   ├── layout/                Sidebar, Navbar, DashboardLayout, NotificationBell
    │   │   ├── dashboard/             StatCard, StockChart, RecentActivity
    │   │   └── <resource>/           Form + Table (+ DetailsModal where relevant) per resource
    │   ├── context/                 AuthContext (who's logged in), ToastContext (notifications)
    │   ├── pages/
    │   │   ├── auth/                  Login, Register, Forgot/Reset Password
    │   │   ├── admin/                 Users, Reports, Analytics, Activity Logs, Settings
    │   │   ├── staff/                 StaffDashboard (simplified, no financial data)
    │   │   └── *.jsx                  Dashboard, Products, Categories, Suppliers, Purchases,
    │   │                              Sales, Customers, StockAlerts, Profile
    │   ├── utils/                   formatCurrency, roleLabel, downloadBlob, tokenStorage
    │   ├── index.css                 The entire design system (one file, CSS variables per role theme)
    │   └── App.jsx                   All routes + role-gating
    └── package.json
```

---

## 2. Major Features

- **Three-panel role system**: Admin (full access, own indigo theme), Accountant/Manager
  (operational + financial access, teal theme), Staff (simplified, amber theme).
- **Product management**: full CRUD, auto-generated SKU (`ELEC-MOB-0001` style) and barcode,
  photo upload, search/filter/pagination, per-product stock movement history.
- **Category & Supplier management**: full CRUD, photo upload (categories), extended
  supplier profile (company, address, tax number, status).
- **Purchases**: create a purchase order, receive it (auto-increases stock + logs a
  StockMovement), track payment status independently of receiving status.
- **Sales / Billing**: point-of-sale style cart with barcode-scan quick-add, atomic checkout
  (stock is validated for every line before anything is committed - a sale never partially
  succeeds), auto-generated invoice number, print-friendly invoice view, cancel/refund flow
  that restores stock.
- **Customers**: CRUD with auto-tracked total-purchases and last-purchase-date.
- **CSV import/export**: products import with a full preview step (see exactly what would be
  created/skipped/duplicated before committing); CSV export for Products, Suppliers,
  Customers, Sales, and Purchases.
- **Analytics & Reports**: inventory analytics (stock value, category/supplier breakdown),
  sales analytics (daily/weekly/monthly trends, top-selling products), purchase analytics
  (supplier-wise spend, trends), profit analytics (product/category/monthly - with an honest
  disclosed limitation, see §6).
- **Notifications & Activity Logs**: role-scoped notification center (low/out-of-stock,
  new purchase/sale, purchase received, sale cancelled, payment marked paid); a full audit
  trail of who-did-what across every module.
- **Dashboards**: three distinct dashboards (Admin/Manager share a layout with reordered
  priorities; Staff gets a dedicated simplified one with zero financial figures, enforced
  backend-side, not just hidden in the UI).
- **Mobile-responsive**: hamburger navigation, scrollable tables, stacking forms, all verified
  down to narrow phone-width viewports.

---

## 3. Role Permissions

The full, current permission matrix (from `server/config/permissions.js`, verified by an
automated test during Phase 13):

| Permission | Admin | Manager | Staff |
|---|:---:|:---:|:---:|
| users.view / create / update / delete | ✅ | ❌ | ❌ |
| products.view | ✅ | ✅ | ✅ |
| products.create / update | ✅ | ✅ | ✅ |
| products.delete | ✅ | ✅ | ❌ |
| categories.view | ✅ | ✅ | ✅ |
| categories.create / update / delete | ✅ | ✅ | ❌ |
| suppliers.view | ✅ | ✅ | ✅ |
| suppliers.create / update / delete | ✅ | ✅ | ❌ |
| inventory.update (manual stock adjust) | ✅ | ✅ | ✅ |
| reports.view / analytics.view | ✅ | ✅ | ❌ |
| imports.create (CSV) | ✅ | ✅ | ❌ |
| purchases.view / create / update / receive | ✅ | ✅ | ❌ |
| purchases.delete | ✅ | ❌ | ❌ |
| customers.view / create | ✅ | ✅ | ✅ |
| customers.update / delete | ✅ | ✅ | ❌ |
| sales.view / create | ✅ | ✅ | ✅ |
| sales.cancel | ✅ | ✅ | ❌ |

**32 total permissions.** Admin has all 32; Manager has 27 (everything except user management
and purchase deletion); Staff has 10 (view + light create across the operational modules,
no delete/financial-reporting/purchasing access anywhere).

Permissions are enforced **in backend middleware** (`requirePermission()` /`authorize()` on
every route) - never only by hiding a button in the UI.

---

## 4. API Summary

See **`docs/API.md`** for the complete, current, route-by-route reference (methods, paths,
required role/permission, and notes) across Auth, Products, Categories, Suppliers, Purchases,
Sales, Customers, Dashboard, Stock Alerts, Notifications, Profile, and Admin (Users, Reports,
Analytics, Activity Logs, Settings).

---

## 5. Database Model Summary

| Model | Purpose | Key relationships |
|---|---|---|
| `User` | Login accounts | - |
| `Product` | The core inventory record | belongs to Category + Supplier |
| `Category` | Groups products | has many Products |
| `Supplier` | Who products are bought from | has many Products, Purchases |
| `Customer` | Who products are sold to | has many Sales |
| `Purchase` | A purchase order (pending → received) | belongs to Supplier; embeds product line items |
| `Sale` | A completed checkout / invoice | optionally belongs to Customer; embeds product line items |
| `StockMovement` | Audit trail of every quantity change | belongs to Product; types: PURCHASE, SALE, RETURN, ADJUSTMENT |
| `StockAlert` | Low-stock / out-of-stock flags | belongs to Product |
| `Notification` | Role-scoped in-app notifications | recipientRole: admin/manager/staff/all |
| `ActivityLog` | Who did what, and where | belongs to User |
| `Settings` | System-wide settings (Admin-managed) | - |

_Note: an early two-role `Role` model (from before the Manager role existed) was found unused
during Phase 14 and removed - `config/permissions.js` has been the actual source of truth
for roles/permissions since Phase 2._

---

## 6. Testing Summary

Everything below was verified **at the code level** in this sandboxed environment (no live
MongoDB was available to run the app end-to-end):

- **Permission matrix**: every one of the 32 permissions tested against all 3 roles via an
  automated script - matches the table in §3 exactly.
- **Middleware behavior**: `authorize()`/`requirePermission()` simulated directly - confirmed
  401 with no user, 403 for a wrong role/permission, pass-through for a correct one.
- **Route audit**: every route in every router file checked for having an appropriate
  guard; two real gaps were found and fixed during Phase 13 (increase/decrease-stock had no
  explicit permission check; image-upload validation errors weren't mapped to a clean 400).
- **Backend**: full `node -c` syntax check and a full `server.js` module-load test after
  every phase.
- **Frontend**: `npm run lint` (0 errors throughout) and `npm run build` after every phase.
- **Business logic**: SKU/barcode/PO-number/invoice-number generation format-checked against
  the spec's examples; negative-stock prevention confirmed at three layers (manual decrease,
  sale checkout, schema minimum); CSV escaping tested against embedded commas/quotes.

**What was NOT tested** (because it requires a live database + browser): actual login flow,
real file uploads, real CSV import/export round-trips, real chart rendering, and anything
that depends on wall-clock timing (token expiry, password-reset link expiry). A manual
smoke test with real MongoDB is recommended before any real use.

---

## 7. Remaining Limitations

- **Single `price` field on Product**, rather than a `purchasePrice`/`sellingPrice` split (this
  was an open decision flagged since Phase 6 and never resolved either way). Purchase and
  Sale records each snapshot their own price per line item, which covers day-to-day
  operation, but Product itself doesn't carry a "standard cost."
- **Profit Analytics cost basis**: because of the above, "cost" is calculated as each
  product's *weighted-average purchase price* across all received Purchase Orders. A product
  that was only ever created/adjusted manually (never actually purchased through the system)
  shows cost ₹0, overstating its profit - the API returns a `note` field and the UI surfaces
  it as a visible warning, rather than presenting the number as more certain than it is.
- **No separate Payment ledger** for partial/installment payments - `paymentMethod`/
  `paymentStatus` live directly on the Sale/Purchase record, not as their own collection.
- **No email sending configured** - password reset links are returned directly in the API
  response (clearly logged as `[DEV]` only) instead of emailed, since adding an email
  provider would be a new external dependency the spec says to avoid unless required.
- **No automated test suite** (unit/integration tests) - all verification in this project was
  manual code review + the scripted checks described in §6.
- **No full accessibility audit** (screen-reader testing, focus-trapping inside modals,
  keyboar-only navigation testing) beyond the basics (alt text on all images, aria-labels on
  icon-only buttons, associated `<label>`s on all form inputs).
- **Single large JS bundle** (~925 KB) - the build warns about this; code-splitting by route
  would reduce initial load time but wasn't undertaken (see §8).

---

## 8. Future Enhancement Suggestions

- Split the Product model's `price` into `purchasePrice`/`sellingPrice`, and make Profit
  Analytics use that directly instead of the current average-purchase-price approximation.
- Add a dedicated `Payment` collection to support partial/installment payments against a
  single Sale or Purchase.
- Route-based code-splitting (`React.lazy` + `Suspense`) to shrink the initial JS bundle.
- Real email delivery for password reset (swap the `[DEV]` console log for e.g. Nodemailer +
  SMTP, SendGrid, or Resend - the exact spot to plug it in is commented in
  `authController.js`).
- A camera-based barcode scanner on mobile (the current barcode support is
  type-or-paste-then-Enter, which works but isn't true camera scanning).
- An automated test suite (e.g. Jest + Supertest for the API, React Testing Library for
  components) to replace/complement the manual verification this project relied on.
- Multi-warehouse / multi-location stock tracking, if the business ever needs more than one
  physical location.
