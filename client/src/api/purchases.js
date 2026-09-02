// src/api/purchases.js
// Full wrapper functions for the Purchase Order API (Phase 7).

import axiosInstance from './axiosInstance';

export const getPurchases = (params = {}) =>
  axiosInstance.get('/purchases', { params }).then((res) => res.data);

export const getPurchaseById = (id) =>
  axiosInstance.get(`/purchases/${id}`).then((res) => res.data);

export const createPurchase = (data) =>
  axiosInstance.post('/purchases', data).then((res) => res.data);

export const updatePurchase = (id, data) =>
  axiosInstance.put(`/purchases/${id}`, data).then((res) => res.data);

export const updatePurchasePaymentStatus = (id, paymentStatus) =>
  axiosInstance.patch(`/purchases/${id}/payment-status`, { paymentStatus }).then((res) => res.data);

export const receivePurchase = (id) =>
  axiosInstance.post(`/purchases/${id}/receive`).then((res) => res.data);

export const deletePurchase = (id) =>
  axiosInstance.delete(`/purchases/${id}`).then((res) => res.data);
