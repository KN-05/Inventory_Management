// src/context/useAuth.js
// Holds the AuthContext object itself AND the useAuth() hook that
// consumes it - both live here (not in AuthContext.jsx) so that file can
// export just the AuthProvider component, matching
// react/only-export-components. AuthContext.jsx imports the context
// object back from here for its <AuthContext.Provider>.

import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
}
