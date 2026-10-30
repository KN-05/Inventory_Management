// src/components/common/ProtectedRoute.jsx
// Wraps every private page. Redirects to /login if there is no session, and -
// for accounts that are signed in but not ready - to the page that fixes it:
//   /onboarding  the new business is not set up yet
//   /renew       the business's trial / subscription has run out

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, workspace } = useAuth();

  if (loading) {
    return <p style={{ padding: '2rem' }}>Loading...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (workspace?.next === 'onboarding') return <Navigate to="/onboarding" replace />;
  if (workspace?.next === 'renew') return <Navigate to="/renew" replace />;

  return children;
}

export default ProtectedRoute;
