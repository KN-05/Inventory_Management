// src/api/dashboard.js

import axiosInstance from './axiosInstance';

export const getDashboardSummary = () =>
  axiosInstance.get('/dashboard/summary').then((res) => res.data.summary);
