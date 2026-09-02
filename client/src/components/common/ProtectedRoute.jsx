// src/components/common/ProtectedRoute.jsx
// Wrap any route that requires the user to be logged in.
// If auth state is still loading (checking localStorage), show nothing/a
// loader. If not authenticated, redirect to /login.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <p style={{ padding: '2rem' }}>Loading...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
