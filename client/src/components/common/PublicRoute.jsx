// src/components/common/PublicRoute.jsx
// PHASE 16: opposite of ProtectedRoute - wraps a route that should only
// be visible to a LOGGED-OUT user (currently just /login). If the user
// is already authenticated and tries to open it, send them straight to
// /dashboard instead of showing the login form again.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <p style={{ padding: '2rem' }}>Loading...</p>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default PublicRoute;
