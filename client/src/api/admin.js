// src/api/admin.js

import axiosInstance from './axiosInstance';

export const getUsers = () => axiosInstance.get('/admin/users').then((res) => res.data);

export const createUser = (data) =>
  axiosInstance.post('/admin/users', data).then((res) => res.data);

export const updateUserStatus = (id, isActive) =>
  axiosInstance.patch(`/admin/users/${id}/status`, { isActive }).then((res) => res.data);

export const updateUserRole = (id, role) =>
  axiosInstance.patch(`/admin/users/${id}/role`, { role }).then((res) => res.data);

export const getStockReport = () =>
  axiosInstance.get('/admin/reports/stock').then((res) => res.data.report);

export const getSupplierReport = () =>
  axiosInstance.get('/admin/reports/suppliers').then((res) => res.data.report);

// PHASE 10: Sales / Purchase / Profit analytics.
export const getSalesAnalytics = () =>
  axiosInstance.get('/admin/analytics/sales').then((res) => res.data.analytics);

export const getPurchaseAnalytics = () =>
  axiosInstance.get('/admin/analytics/purchases').then((res) => res.data.analytics);

export const getProfitAnalytics = () =>
  axiosInstance.get('/admin/analytics/profit').then((res) => res.data.analytics);
