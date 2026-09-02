// src/api/lookups.js
// Read-only "lookup list" calls used to populate dropdowns (Category,
// Supplier, Product) in forms across the app.

import axiosInstance from './axiosInstance';

export const getCategoryOptions = () =>
  axiosInstance.get('/categories').then((res) => res.data.categories);

export const getSupplierOptions = () =>
  axiosInstance.get('/suppliers').then((res) => res.data.suppliers);

// PHASE 7: used by PurchaseForm's product picker. A high `limit` is
// enough for this project's scale - a true type-ahead search would be
// the next step for a much larger catalog.
export const getProductOptions = () =>
  axiosInstance.get('/products', { params: { limit: 1000 } }).then((res) => res.data.products);
