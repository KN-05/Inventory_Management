// src/api/customers.js
// Full CRUD wrapper functions for the Customer API (Phase 8).

import axiosInstance from './axiosInstance';

export const getCustomers = (params = {}) =>
  axiosInstance.get('/customers', { params }).then((res) => res.data);

export const getCustomerById = (id) =>
  axiosInstance.get(`/customers/${id}`).then((res) => res.data);

export const createCustomer = (data) =>
  axiosInstance.post('/customers', data).then((res) => res.data);

export const updateCustomer = (id, data) =>
  axiosInstance.put(`/customers/${id}`, data).then((res) => res.data);

export const deleteCustomer = (id) =>
  axiosInstance.delete(`/customers/${id}`).then((res) => res.data);

// PHASE 9: CSV export - see the identical pattern/reasoning in api/products.js.
export const exportCustomersCsv = () =>
  axiosInstance.get('/customers/export', { responseType: 'blob' }).then((res) => res.data);
