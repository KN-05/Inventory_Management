// src/context/AuthContext.jsx
// A React Context that holds the logged-in user's info and JWT token,
// and exposes login/register/logout functions. Any component can access
// this with the `useAuth()` hook instead of passing props everywhere.

import { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import {
  setSession,
  getToken,
  getStoredUser,
  updateStoredUserData,
  clearSession,
} from '../utils/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check storage on first load

  // On first app load, check if we already have a token saved (user
  // refreshed the page or came back later) and restore their session.
  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getToken();

    if (storedUser && token) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  // PHASE 2: `remember` controls whether the session persists across
  // browser restarts (localStorage) or only for this tab/session
  // (sessionStorage) - see utils/tokenStorage.js.
  const login = async (email, password, remember = true) => {
    const { data } = await axiosInstance.post('/auth/login', { email, password });
    setSession(data.token, data.user, remember);
    setUser(data.user);
    return data.user;
  };

  // Public registration only ever succeeds for the very first (bootstrap
  // Admin) account - see authController.js. Always "remembered" since
  // there's no login form step for this flow.
  const register = async (name, email, password) => {
    const { data } = await axiosInstance.post('/auth/register', {
      name,
      email,
      password,
    });
    setSession(data.token, data.user, true);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      // Best-effort call - logout works client-side regardless of this succeeding
      await axiosInstance.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    } finally {
      clearSession();
      setUser(null);
    }
  };

  // Called after a profile update (name/email/photo) so the header,
  // dashboard greeting, etc. stay in sync without requiring a full page
  // reload or re-login.
  const updateStoredUser = (updatedUser) => {
    updateStoredUserData(updatedUser);
    setUser(updatedUser);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isStaff: user?.role === 'staff',
    loading,
    login,
    register,
    logout,
    updateStoredUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for consuming the context - throws a clear error if used
// outside of <AuthProvider>, which is much easier to debug than "undefined".
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
}
