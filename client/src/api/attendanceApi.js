// src/api/attendanceApi.js
// PHASE 34: Attendance API. Who can call what is enforced on the backend
// (routes/attendanceRoutes.js) - Staff/Manager: me + check-in, Admin/Manager:
// overview + per-user history, Manager only: edit.

import axiosInstance from './axiosInstance';

export const checkIn = () => axiosInstance.post('/attendance/check-in').then((res) => res.data);

// `month` is "YYYY-MM"; omit it to get the current month (server decides
// "current" in the business timezone).
export const getMyAttendance = (month) =>
  axiosInstance.get('/attendance/me', { params: { month } }).then((res) => res.data);

export const getAttendanceOverview = (month) =>
  axiosInstance.get('/attendance/overview', { params: { month } }).then((res) => res.data);

export const getUserAttendance = (userId, month) =>
  axiosInstance.get(`/attendance/user/${userId}`, { params: { month } }).then((res) => res.data);

// Manager only. body = { status: 'present' | 'absent', note?: string }
export const updateUserAttendance = (userId, date, body) =>
  axiosInstance.put(`/attendance/user/${userId}/${date}`, body).then((res) => res.data);
