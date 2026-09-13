// src/api/admin.js

import axiosInstance from './axiosInstance';

export const getUsers = () => axiosInstance.get('/admin/users').then((res) => res.data);

export const createUser = (data) =>
  axiosInstance.post('/admin/users', data).then((res) => res.data);

export const updateUserStatus = (id, isActive) =>
  axiosInstance.patch(`/admin/users/${id}/status`, { isActive }).then((res) => res.data);

export const updateUserRole = (id, role) =>
  axiosInstance.patch(`/admin/users/${id}/role`, { role }).then((res) => res.data);

// PHASE 26: Admin directly resets any user's password (no OTP - the
// Admin performing this is already fully authenticated).
export const adminResetPassword = (id, newPassword) =>
  axiosInstance.post(`/admin/users/${id}/reset-password`, { newPassword }).then((res) => res.data);

// PHASE 26: Manager -> Staff password reset, OTP-gated. The OTP is
// emailed to the STAFF member's own registered email address - see
// server/controllers/adminController.js for the full flow.
export const getStaffList = () => axiosInstance.get('/admin/staff-list').then((res) => res.data.staff);

export const requestStaffPasswordResetOtp = (staffId) =>
  axiosInstance.post(`/admin/users/${staffId}/staff-password-reset/request-otp`).then((res) => res.data);

export const resetStaffPasswordWithOtp = (staffId, otp, newPassword) =>
  axiosInstance
    .post(`/admin/users/${staffId}/staff-password-reset/confirm`, { otp, newPassword })
    .then((res) => res.data);

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
