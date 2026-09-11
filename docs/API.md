# API Documentation

Base URL (local development): `http://localhost:5000/api`

_Last regenerated during Phase 14 (Final Polish) - reflects every route
that exists in `server/routes/` as of this build, across all three roles
(Admin, Manager, Staff)._

## Conventions

- All request/response bodies are JSON, except file uploads (multipart/form-data) and CSV exports (`text/csv`).
- Success responses follow `{ "success": true, ... }`.
- Error responses follow `{ "success": false, "message": "...", "errors": [...] }` (the `errors` array only appears on express-validator failures).
- **Authentication**: every route below except `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`, and `POST /auth/reset-password/:token` requires:
  ```
  Authorization: Bearer <token>
  ```
  The token is returned by register/login and expires based on `JWT_EXPIRES_IN` in `.env` (default 7 days).
- **Roles**: `admin`, `manager`, `staff`. Permission enforcement is granular - see `server/config/permissions.js` for the exact permission-to-role map, and the **Role Permissions** table in `PROJECT-SUMMARY.md` for a human-readable version. Routes below are annotated with which role(s) can call them.
- **Registration**: `POST /auth/register` only works while **no Admin exists yet** - the first registered account becomes Admin, then the endpoint closes itself. Every other account is created by an Admin via `POST /admin/users`.

---

## Auth — `/api/auth`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/register` | Public (once) | First-ever account only; becomes Admin |
| POST | `/login` | Public | Returns `{ token, user }` |
| POST | `/logout` | Any logged-in user | Stateless JWT - real logout is deleting the token client-side |
| GET | `/me` | Any logged-in user | Current user's own profile |
| POST | `/forgot-password` | Public | Always returns the same generic message (no email enumeration) |
| POST | `/reset-password/:token` | Public | `{ newPassword }`; token expires after 30 minutes |

## Products — `/api/products`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/export` | View products | CSV download; **must** stay registered before `/:id` |
| GET | `/` | View products | `?search=&category=&supplier=&status=&page=&limit=` |
| GET | `/:id` | View products | |
| POST | `/` | Create products | SKU + barcode auto-generated, never accepted from client |
| POST | `/import` | Import CSV (Admin/Manager) | `?preview=true` validates only, no DB writes; `?preview=false` inserts |
| PUT | `/:id` | Update products | SKU/barcode immutable after creation |
| POST | `/:id/image` | Update products | multipart, field name `image` |
| PATCH | `/:id/increase-stock` | Adjust inventory | `{ amount }`; writes a StockMovement |
| PATCH | `/:id/decrease-stock` | Adjust inventory | Blocks going below 0 |
| GET | `/:id/stock-movements` | View products | Last 20 movements, newest first |
| DELETE | `/:id` | Admin + Manager only | |

## Categories — `/api/categories`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/export` | View categories | CSV download |
| GET | `/` | View categories | `?search=` |
| GET | `/:id` | View categories | |
| POST | `/` | Admin + Manager | |
| PUT | `/:id` | Admin + Manager | |
| POST | `/:id/image` | Admin + Manager | multipart, field name `image` |
| DELETE | `/:id` | Admin + Manager | |

## Suppliers — `/api/suppliers`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/export` | View suppliers | CSV download |
| GET | `/` | View suppliers | `?search=` |
| GET | `/:id` | View suppliers | |
| POST | `/` | Admin + Manager | |
| PUT | `/:id` | Admin + Manager | |
| DELETE | `/:id` | Admin + Manager | |

## Purchases — `/api/purchases` (Admin + Manager only - Staff has no access at all)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/export` | View purchases | CSV download, one row per line item |
| GET | `/` | View purchases | `?supplier=&status=&paymentStatus=&search=&page=&limit=` |
| GET | `/:id` | View purchases | |
| POST | `/` | Create purchases | Status starts `pending`; stock unaffected until received |
| PUT | `/:id` | Update purchases | Only while `status === 'pending'` |
| PATCH | `/:id/payment-status` | Update purchases | `{ paymentStatus }` - allowed regardless of pending/received |
| POST | `/:id/receive` | Receive purchases | Increases stock + writes StockMovement per item |
| DELETE | `/:id` | **Admin only** | Only while still `pending` |

## Sales — `/api/sales`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/export` | View sales | CSV download, one row per line item |
| GET | `/` | View sales | `?customer=&status=&search=&page=&limit=` |
| GET | `/:id` | View sales | Powers the invoice view |
| POST | `/` | Create sales | Atomic checkout: validates stock, decreases it, generates invoice, all in one request |
| POST | `/:id/cancel` | Admin + Manager | Restores stock via a `RETURN` StockMovement |

## Customers — `/api/customers`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/export` | View customers | CSV download |
| GET | `/` | View customers | `?search=&page=&limit=` |
| GET | `/:id` | View customers | |
| POST | `/` | Create customers (all 3 roles) | |
| PUT | `/:id` | Admin + Manager | |
| DELETE | `/:id` | Admin + Manager | |

## Dashboard — `/api/dashboard`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/summary` | Any logged-in user | Content differs by role - `totalStockValue` is omitted entirely for Staff, even if called directly |

## Stock Alerts — `/api/alerts`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Any logged-in user | `?status=active|resolved` |
| PATCH | `/:id/resolve` | Any logged-in user | Deliberately open to all roles - see comment in `routes/stockAlertRoutes.js` |

## Notifications — `/api/notifications`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Any logged-in user | Only returns notifications scoped to the caller's own role (or `'all'`) |
| GET | `/unread-count` | Any logged-in user | |
| PATCH | `/:id/read` | Any logged-in user | |
| PATCH | `/read-all` | Any logged-in user | |

## Profile — `/api/profile` (always operates on the caller's own account)

| Method | Path | Access |
|---|---|---|
| GET | `/` | Any logged-in user |
| PUT | `/` | Any logged-in user |
| POST | `/photo` | Any logged-in user |
| PUT | `/change-password` | Any logged-in user |

## Admin — `/api/admin`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/users` | Admin only | |
| POST | `/users` | Admin only | Creates Manager/Staff accounts |
| PATCH | `/users/:id/status` | Admin only | Activate/deactivate |
| PATCH | `/users/:id/role` | Admin only | |
| GET | `/reports/stock` | Admin + Manager | Inventory Analytics (stock value, category/supplier breakdown) |
| GET | `/reports/suppliers` | Admin + Manager | |
| GET | `/analytics/sales` | Admin + Manager | Daily/weekly/monthly revenue, top-selling products |
| GET | `/analytics/purchases` | Admin + Manager | Supplier-wise spend, monthly trend |
| GET | `/analytics/profit` | Admin + Manager | Product/category/monthly profit - see the cost-basis limitation noted in the response's `note` field |
| GET | `/activity-logs` | Admin only | `?module=&user=&page=&limit=` |
| GET | `/settings` | Admin only | |
| PUT | `/settings` | Admin only | |

---

## File uploads

All image uploads (product/category/profile photos) accept `.jpg`, `.jpeg`, `.png`, `.webp` up to 2MB, field name as noted above. CSV import accepts `.csv` up to 2MB, field name `file`.

## Error responses you'll actually see

| Status | When |
|---|---|
| 400 | Validation failure, bad CSV/image file, duplicate unique field (SKU/email/etc.) |
| 401 | Missing/invalid/expired token |
| 403 | Valid token, but the role/permission doesn't allow this action; also a deactivated account |
| 404 | Resource not found, or no route matched at all |
| 500 | Unexpected server error (stack trace included only outside production) |
