// src/api/categories.js
// Full CRUD wrapper functions for the Category API (Phase 5).

import axiosInstance from './axiosInstance';

export const getCategories = (params = {}) =>
  axiosInstance.get('/categories', { params }).then((res) => res.data);

export const createCategory = (data) =>
  axiosInstance.post('/categories', data).then((res) => res.data);

export const updateCategory = (id, data) =>
  axiosInstance.put(`/categories/${id}`, data).then((res) => res.data);

export const deleteCategory = (id) =>
  axiosInstance.delete(`/categories/${id}`).then((res) => res.data);

// PHASE 6: category photo upload - same multipart pattern as product/profile photos.
export const uploadCategoryImage = (id, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return axiosInstance
    .post(`/categories/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};
