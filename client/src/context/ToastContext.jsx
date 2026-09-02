// src/context/ToastContext.jsx
// A global notification system (Phase 10 polish). Replaces the scattered
// "local message state + setTimeout" pattern each page previously
// duplicated (Products, Categories, Suppliers, etc.) with one shared
// implementation: call `toast.success('Product added')` from anywhere.

import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type, text) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, type, text }]);
      // Auto-dismiss after 4 seconds, same timing the old per-page banners used.
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const toast = {
    success: (text) => addToast('success', text),
    error: (text) => addToast('error', text),
    info: (text) => addToast('info', text),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast-${t.type}`}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {t.text}
              <button
                className="toast-close"
                aria-label="Dismiss notification"
                onClick={() => removeToast(t.id)}
              >
                &times;
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a <ToastProvider>');
  }
  return context;
}
