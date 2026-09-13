// src/api/profile.js

import axiosInstance from './axiosInstance';

export const getProfile = () => axiosInstance.get('/profile').then((res) => res.data);

export const updateProfile = (data) =>
  axiosInstance.put('/profile', data).then((res) => res.data);

export const changePassword = (currentPassword, newPassword) =>
  axiosInstance
    .put('/profile/change-password', { currentPassword, newPassword })
    .then((res) => res.data);

// PHASE 25: re-confirms the CURRENTLY LOGGED-IN user's own password
// before a sensitive action (add/edit product, CSV import) proceeds -
// see components/common/PasswordConfirmModal.jsx for where this is used.
// Throws (rejects) on a wrong password - the 401 flows through to the
// caller's try/catch exactly like every other API call in this app.
export const verifyPassword = (password) =>
  axiosInstance.post('/profile/verify-password', { password }).then((res) => res.data);

// PHASE 2: sends the photo as multipart/form-data - same override pattern
// as the CSV import in api/products.js (letting the browser set the
// multipart boundary automatically instead of axios's default JSON header).
export const uploadPhoto = (file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return axiosInstance
    .post('/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};
