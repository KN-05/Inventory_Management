// src/context/useToast.js
// Holds the ToastContext object AND the useToast() hook, same pattern
// (and reasoning) as context/useAuth.js.

import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a <ToastProvider>');
  }
  return context;
}
