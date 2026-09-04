// src/api/sales.js
// Wrapper functions for the Sale/Billing API (Phase 8).

import axiosInstance from './axiosInstance';

export const getSales = (params = {}) =>
  axiosInstance.get('/sales', { params }).then((res) => res.data);

export const getSaleById = (id) =>
  axiosInstance.get(`/sales/${id}`).then((res) => res.data);

export const createSale = (data) =>
  axiosInstance.post('/sales', data).then((res) => res.data);

export const cancelSale = (id) =>
  axiosInstance.post(`/sales/${id}/cancel`).then((res) => res.data);

// PHASE 9: CSV export - see the identical pattern/reasoning in api/products.js.
export const exportSalesCsv = () =>
  axiosInstance.get('/sales/export', { responseType: 'blob' }).then((res) => res.data);
