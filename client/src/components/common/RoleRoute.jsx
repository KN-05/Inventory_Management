// src/components/common/RoleRoute.jsx
// Wrap any route that should only be visible to specific roles, e.g.:
//   <RoleRoute allowedRoles={['admin']}><UserManagement /></RoleRoute>
// Assumes the user is already known to be logged in (use inside/after
// ProtectedRoute). If their role isn't allowed, redirect to the dashboard
// instead of showing a blank/broken page.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default RoleRoute;
