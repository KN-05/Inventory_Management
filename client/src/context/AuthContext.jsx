// src/context/AuthContext.jsx
// A React Context that holds the logged-in user's info and JWT token,
// and exposes login/register/logout functions. Any component can access
// this with the `useAuth()` hook instead of passing props everywhere.

import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import {
  setSession,
  getToken,
  getStoredUser,
  updateStoredUserData,
  clearSession,
} from '../utils/tokenStorage';

// PHASE 14 CONSISTENCY FIX: the context object itself now lives in
// useAuth.js (not exported from here) - oxlint's react/only-export-components
// rule wants a component file to export ONLY components, and that applies
// to the raw context object just as much as it did to the useAuth() hook.
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Where this signed-in person belongs, as decided by the SERVER:
  // { next: 'dashboard' | 'onboarding' | 'renew', business, subscription, onboarding }.
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check storage on first load

  // On first app load, check if we already have a token saved (user
  // refreshed the page or came back later) and restore their session.
  // The server is then asked who we are NOW, because the account may have
  // finished onboarding, or its subscription may have run out, since the
  // last visit.
  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getToken();

    if (!(storedUser && token)) {
      setLoading(false);
      return;
    }
    setUser(storedUser);
    axiosInstance
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        setWorkspace(data.workspace || null);
        updateStoredUserData(data.user);
      })
      .catch(() => {
        // offline / server down: keep the stored user; pages show their own errors
      })
      .finally(() => setLoading(false));
  }, []);

  // Every way of signing in (password, Google, sign-up, finishing onboarding)
  // ends here: stores the session + workspace and returns the server response.
  const startSession = (data, remember = true) => {
    setSession(data.token, data.user, remember);
    setUser(data.user);
    setWorkspace(data.workspace || null);
    return data;
  };

  // Re-read the account + workspace from the server (e.g. after a renewal).
  const refreshWorkspace = async () => {
    const { data } = await axiosInstance.get('/auth/me');
    setUser(data.user);
    setWorkspace(data.workspace || null);
    updateStoredUserData(data.user);
    return data;
  };

  // PHASE 2: `remember` controls whether the session persists across
  // browser restarts (localStorage) or only for this tab/session
  // (sessionStorage) - see utils/tokenStorage.js.
  const login = async (email, password, remember = true) => {
    const { data } = await axiosInstance.post('/auth/login', { email, password });
    return startSession(data, remember); // { token, user, workspace, next }
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
      setWorkspace(null);
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
    workspace,
    loading,
    startSession,
    refreshWorkspace,
    login,
    register,
    logout,
    updateStoredUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
