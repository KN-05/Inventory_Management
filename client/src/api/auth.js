// src/api/auth.js
// Forgot/reset password calls - separate from AuthContext.jsx's
// login/register since these don't need to touch logged-in user state.

import axiosInstance from './axiosInstance';

export const forgotPassword = (email) =>
  axiosInstance.post('/auth/forgot-password', { email }).then((res) => res.data);

export const resetPassword = (token, newPassword) =>
  axiosInstance.post(`/auth/reset-password/${token}`, { newPassword }).then((res) => res.data);
