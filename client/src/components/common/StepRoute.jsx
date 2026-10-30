// src/components/common/StepRoute.jsx
// Guards the two "in-between" pages of the sign-up journey:
//   <StepRoute step="onboarding">  only for a new account whose business is not set up
//   <StepRoute step="renew">       only for a business whose subscription has run out
// Anyone else is sent to where they belong, so nobody can wander onto the wrong page.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

function StepRoute({ step, children }) {
  const { isAuthenticated, loading, workspace } = useAuth();

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const next = workspace?.next || 'dashboard';
  if (next !== step) {
    const target = { onboarding: '/onboarding', renew: '/renew' }[next] || '/dashboard';
    return <Navigate to={target} replace />;
  }
  return children;
}

export default StepRoute;
