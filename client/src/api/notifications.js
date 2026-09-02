// src/api/notifications.js

import axiosInstance from './axiosInstance';

export const getNotifications = (unreadOnly = false) =>
  axiosInstance
    .get('/notifications', { params: unreadOnly ? { unreadOnly: 'true' } : {} })
    .then((res) => res.data);

export const getUnreadCount = () =>
  axiosInstance.get('/notifications/unread-count').then((res) => res.data.count);

export const markAsRead = (id) =>
  axiosInstance.patch(`/notifications/${id}/read`).then((res) => res.data);

export const markAllAsRead = () =>
  axiosInstance.patch('/notifications/read-all').then((res) => res.data);
