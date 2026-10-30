// src/api/axiosInstance.js

// A single, shared Axios instance for the whole app.
// Every API call should use this instance.

import axios from 'axios';
import { getToken, clearSession } from '../utils/tokenStorage';

// API Base URL
// Production: Netlify environment variable
// Local development: localhost fallback

const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST INTERCEPTOR
// Automatically attaches JWT token to every request.

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// RESPONSE INTERCEPTOR
// Handles authentication and subscription errors.

axiosInstance.interceptors.response.use(
  (response) => response,

  (error) => {
    const requestUrl = error.config?.url || '';

    // Do not redirect on login/signup/password reset errors.
    const isAuthAttempt =
      /\/auth\/(login|google|signup|forgot-password|reset-password)/i.test(
        requestUrl
      );

    // Handle unauthorized requests.
    if (
      error.response &&
      error.response.status === 401 &&
      !isAuthAttempt
    ) {
      clearSession();
      window.location.href = '/login';
    }

    // Handle subscription expiry.
    const code = error.response?.data?.code;

    if (
      code === 'SUBSCRIPTION_EXPIRED' &&
      window.location.pathname !== '/renew'
    ) {
      window.location.assign('/renew');
    }

    // Handle onboarding requirement.
    if (
      code === 'ONBOARDING_REQUIRED' &&
      window.location.pathname !== '/onboarding'
    ) {
      window.location.assign('/onboarding');
    }

    return Promise.reject(error);
  }
);

// API ORIGIN
// Converts uploaded-file paths into complete URLs.

export const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

export default axiosInstance;