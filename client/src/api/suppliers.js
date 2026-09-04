// src/api/suppliers.js
// Full CRUD wrapper functions for the Supplier API (Phase 5).

import axiosInstance from './axiosInstance';

export const getSuppliers = (params = {}) =>
  axiosInstance.get('/suppliers', { params }).then((res) => res.data);

export const getSupplierById = (id) =>
  axiosInstance.get(`/suppliers/${id}`).then((res) => res.data);

export const createSupplier = (data) =>
  axiosInstance.post('/suppliers', data).then((res) => res.data);

export const updateSupplier = (id, data) =>
  axiosInstance.put(`/suppliers/${id}`, data).then((res) => res.data);

export const deleteSupplier = (id) =>
  axiosInstance.delete(`/suppliers/${id}`).then((res) => res.data);

// PHASE 9: CSV export - see the identical pattern/reasoning in api/products.js.
export const exportSuppliersCsv = () =>
  axiosInstance.get('/suppliers/export', { responseType: 'blob' }).then((res) => res.data);
