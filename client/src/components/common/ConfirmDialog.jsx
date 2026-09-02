// src/components/common/ConfirmDialog.jsx
// A simple reusable confirmation modal, e.g. for "Are you sure you want to
// delete this product?" Uses AnimatedModal for consistent Framer Motion
// entrance/exit across the app.

import AnimatedModal from './AnimatedModal';
import Button from './Button';

function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm' }) {
  return (
    <AnimatedModal open={open} onClose={onCancel}>
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </AnimatedModal>
  );
}

export default ConfirmDialog;
