// src/api/axiosInstance.js
// A single, shared Axios instance for the whole app.
// Every API call in the project should import THIS instead of calling axios directly.
// Why? Because we configure the base URL and auth token handling in ONE place.

import axios from 'axios';
import { getToken, clearSession } from '../utils/tokenStorage';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST interceptor: runs before every request is sent.
// If we have a JWT token saved (from login), attach it automatically
// so we don't have to remember to do this in every single API call.
// getToken() checks both localStorage and sessionStorage (Remember Me).
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RESPONSE interceptor: runs after every response comes back.
// If the token is invalid/expired (401 Unauthorized), we log the user out
// and send them back to the login page.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearSession();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// PHASE 6: shared helper for turning a relative uploaded-file path (e.g.
// "/uploads/product-photos/x.jpg") into a real, loadable URL. Previously
// duplicated inline in Profile.jsx; now exported here so
// ProductForm/ProductTable/CategoryForm etc. can reuse the exact same
// derivation instead of re-implementing it slightly differently each time.
export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
);

export default axiosInstance;
