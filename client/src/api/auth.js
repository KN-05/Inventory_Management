// src/api/auth.js
// Forgot/reset password calls - separate from AuthContext.jsx's
// login/register since these don't need to touch logged-in user state.

import axiosInstance from './axiosInstance';

// Google sign-in / sign-up. `credential` is the ID token Google gives the
// browser; the SERVER verifies it. intent: 'signin' | 'signup'.
export const googleAuth = (credential, intent) =>
  axiosInstance.post('/auth/google', { credential, intent }).then((res) => res.data);

// New business account with e-mail + password (alternative to Google)
export const signupWithEmail = (name, email, password) =>
  axiosInstance.post('/auth/signup', { name, email, password }).then((res) => res.data);

export const forgotPassword = (email) =>
  axiosInstance.post('/auth/forgot-password', { email }).then((res) => res.data);

export const resetPassword = (token, newPassword) =>
  axiosInstance.post(`/auth/reset-password/${token}`, { newPassword }).then((res) => res.data);
