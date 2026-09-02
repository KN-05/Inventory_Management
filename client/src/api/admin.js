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
