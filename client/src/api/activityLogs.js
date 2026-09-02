// src/api/activityLogs.js

import axiosInstance from './axiosInstance';

export const getActivityLogs = (params = {}) =>
  axiosInstance.get('/admin/activity-logs', { params }).then((res) => res.data);
