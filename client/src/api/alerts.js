// src/api/alerts.js

import axiosInstance from './axiosInstance';

export const getAlerts = (status) =>
  axiosInstance.get('/alerts', { params: status ? { status } : {} }).then((res) => res.data);

export const resolveAlert = (id) =>
  axiosInstance.patch(`/alerts/${id}/resolve`).then((res) => res.data);
