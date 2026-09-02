# API Documentation

Base URL (local development): `http://localhost:5000/api`

## Conventions

- All request/response bodies are JSON.
- All responses follow the shape `{ "success": true|false, ... }`.
- Error responses: `{ "success": false, "message": "..." , "errors": [...] }` (the `errors` array only appears on validation failures).
- **Authentication**: every route except `POST /auth/register` and `POST /auth/login` requires a header:
  ```
  Authorization: Bearer <token>
  ```
  The token is returned by register/login and expires based on `JWT_EXPIRES_IN` in `.env` (default 7 days).
- **Roles**: the database stores `admin` or `staff`. Routes marked **Admin only** return `403 Forbidden` for `staff` users, even with a valid token.

---

## Auth — `/api/auth`

### `POST /auth/register`
Public.
```json
// Request body
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123", "role": "staff" }
```
```json
// 201 response
{ "success": true, "message": "Registration successful", "token": "...", "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "staff", "isActive": true } }
```

### `POST /auth/login`
Public.
```json
{ "email": "jane@example.com", "password": "secret123" }
```
Returns the same shape as register. `401` on wrong credentials, `403` if the account is deactivated.

### `POST /auth/logout`
Private. No body required. Clears nothing server-side (JWTs are stateless) — the frontend deletes its stored token.

### `GET /auth/me`
Private. Returns the current user's profile (same shape as the `user` object above).

---

## Products — `/api/products`
All routes Private (Admin + Staff), except delete (Admin only).

### `GET /products`
Query params (all optional): `search`, `category` (id), `supplier` (id), `status` (`In Stock`|`Low Stock`|`Out of Stock`), `page`, `limit`.
```json
{ "success": true, "count": 20, "total": 42, "page": 1, "totalPages": 3, "products": [ /* ... */ ] }
```

### `GET /products/:id`
Returns `{ success, product }`. `404` if not found, `400` if `:id` isn't a valid ID.

### `POST /products` — create
```json
{
  "name": "Wireless Mouse",
  "sku": "ELEC-001",
  "category": "<categoryId>",
  "supplier": "<supplierId>",
  "quantity": 50,
  "price": 19.99,
  "lowStockThreshold": 10
}
```
`400` if the SKU already exists.

### `PUT /products/:id` — update
Same body shape as create; any subset of fields may be sent.

### `DELETE /products/:id` — **Admin only**
Also deletes any Stock Alerts associated with the product.

### `PATCH /products/:id/increase-stock`
```json
{ "amount": 10 }
```

### `PATCH /products/:id/decrease-stock`
```json
{ "amount": 5 }
```
`400` if this would take quantity below 0.

---

## Categories — `/api/categories`
All routes Private (Admin + Staff), except delete (Admin only).

- `GET /categories` → `{ success, count, categories }`
- `GET /categories/:id` → `{ success, category }`
- `POST /categories` → body `{ "name": "...", "description": "..." }`
- `PUT /categories/:id` → same body, partial updates allowed
- `DELETE /categories/:id` — **Admin only**. `400` if any products still reference this category.

---

## Suppliers — `/api/suppliers`
All routes Private (Admin + Staff), except delete (Admin only).

- `GET /suppliers?search=...` → `{ success, count, suppliers }`
- `GET /suppliers/:id` → `{ success, supplier }` — includes a populated `products` array (everything this supplier supplies)
- `POST /suppliers` → body `{ "name": "...", "email": "...", "phone": "...", "address": "..." }`
- `PUT /suppliers/:id` → same body, partial updates allowed
- `DELETE /suppliers/:id` — **Admin only**. `400` if any products still reference this supplier.

---

## Dashboard — `/api/dashboard`
Private (Admin + Staff).

### `GET /dashboard/summary`
```json
{
  "success": true,
  "summary": {
    "totalProducts": 42,
    "totalSuppliers": 5,
    "totalCategories": 4,
    "totalStockValue": 12500.50,
    "activeAlertsCount": 2,
    "stockStatusBreakdown": { "inStock": 30, "lowStock": 8, "outOfStock": 4 },
    "categoryBreakdown": [ { "category": "Electronics", "count": 15 } ],
    "recentActivities": [ { "id": "...", "user": "Jane Doe", "action": "Created product \"X\"", "module": "product", "createdAt": "..." } ]
  }
}
```

---

## Stock Alerts — `/api/alerts`
Private (Admin + Staff). Alerts are created/resolved **automatically** whenever a product's stock status changes (see the Product model's `post('save')` hook) — there is no manual "create alert" endpoint.

- `GET /alerts?status=active|resolved` (status optional — omit for all) → `{ success, count, alerts }`
- `PATCH /alerts/:id/resolve` → marks an alert resolved manually

---

## Admin — `/api/admin`
**All routes Admin only.**

- `GET /admin/users` → `{ success, count, users }`
- `PATCH /admin/users/:id/status` → body `{ "isActive": true|false }`. `400` if you try to change your own status.
- `PATCH /admin/users/:id/role` → body `{ "role": "admin"|"staff" }`. `400` if you try to change your own role.
- `GET /admin/reports/stock` → category breakdown + low-stock/out-of-stock product lists + totals
- `GET /admin/reports/suppliers` → per-supplier product count, quantity, and stock value (includes suppliers with 0 products)

---

## Profile — `/api/profile`
Private. Always operates on the logged-in user (`req.user`) — there's no way to view/edit another user's profile through these routes.

- `GET /profile` → current user's profile
- `PUT /profile` → body `{ "name": "...", "email": "..." }` (either field optional)
- `PUT /profile/change-password` → body `{ "currentPassword": "...", "newPassword": "..." }`. `401` if `currentPassword` is wrong.

---

## Error responses

| Status | Meaning |
|---|---|
| 400 | Validation error, duplicate value, or bad request (e.g. invalid ID format) |
| 401 | Missing/invalid/expired token, or wrong login credentials |
| 403 | Valid token but insufficient role, or account deactivated |
| 404 | Resource not found, or unknown route |
| 500 | Unexpected server error |
