// src/utils/tokenStorage.js
// PHASE 2: "Remember me" support - when checked, the session persists in
// localStorage (survives closing the browser); when unchecked, it's kept
// in sessionStorage only (cleared when the tab/browser closes). Both
// axiosInstance.js and AuthContext.jsx use these helpers instead of
// calling localStorage/sessionStorage directly, so there's one place that
// knows "check both, prefer whichever has it."

export function setSession(token, user, remember) {
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  store.setItem('token', token);
  store.setItem('user', JSON.stringify(user));
  // Clear the other storage so a stale session doesn't linger there
  other.removeItem('token');
  other.removeItem('user');
}

export function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function getStoredUser() {
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function updateStoredUserData(user) {
  // Update whichever storage currently holds the session
  if (localStorage.getItem('token')) {
    localStorage.setItem('user', JSON.stringify(user));
  } else if (sessionStorage.getItem('token')) {
    sessionStorage.setItem('user', JSON.stringify(user));
  }
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
}
