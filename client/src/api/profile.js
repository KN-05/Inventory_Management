// src/api/profile.js

import axiosInstance from './axiosInstance';

export const getProfile = () => axiosInstance.get('/profile').then((res) => res.data);

export const updateProfile = (data) =>
  axiosInstance.put('/profile', data).then((res) => res.data);

export const changePassword = (currentPassword, newPassword) =>
  axiosInstance
    .put('/profile/change-password', { currentPassword, newPassword })
    .then((res) => res.data);

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
