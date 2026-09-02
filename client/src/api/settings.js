// src/api/settings.js

import axiosInstance from './axiosInstance';

export const getSettings = () =>
  axiosInstance.get('/admin/settings').then((res) => res.data.settings);

export const updateSettings = (data) =>
  axiosInstance.put('/admin/settings', data).then((res) => res.data);
