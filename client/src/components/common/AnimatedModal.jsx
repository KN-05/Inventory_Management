// src/components/common/AnimatedModal.jsx
// Shared modal chrome (overlay + box) with Framer Motion entrance/exit,
// used by ConfirmDialog, ProductForm, CategoryForm, and SupplierForm so
// every modal in the app animates identically without repeating the
// AnimatePresence/motion.div boilerplate in each one.
//
// Usage:
//   <AnimatedModal open={open} onClose={onCancel} maxWidth={480}>
//     <h2>Title</h2>
//     ...
//   </AnimatedModal>

import { AnimatePresence, motion } from 'framer-motion';

function AnimatedModal({ open, onClose, maxWidth = 420, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="modal-box"
            style={{ maxWidth }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AnimatedModal;
