// src/components/common/PasswordConfirmModal.jsx
// PHASE 25: a step-up re-authentication modal shown before a sensitive
// action (adding/editing a product, or a bulk CSV import) actually goes
// through. It always asks for the CURRENTLY LOGGED-IN user's own login
// password (via POST /api/profile/verify-password - see api/profile.js)
// - never a separate "admin password" - so whoever is doing the action
// (Admin or Manager) confirms with their own credentials.
//
// This is a generic, reusable modal: pass it an `onVerified` callback and
// it only calls that once the password has actually been confirmed
// against the backend. It doesn't know or care what the action being
// gated is - Products.jsx and ImportCsvModal.jsx just wrap their existing
// submit logic in it.

import { useState } from 'react';
import { verifyPassword } from '../../api/profile';
import AnimatedModal from './AnimatedModal';
import Button from './Button';

function PasswordConfirmModal({ open, title = 'Confirm your password', message, onVerified, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleClose = () => {
    setPassword('');
    setError('');
    onCancel();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Enter your password');
      return;
    }
    setError('');
    setChecking(true);
    try {
      await verifyPassword(password);
      setPassword('');
      onVerified();
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect password');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AnimatedModal open={open} onClose={handleClose} maxWidth={380}>
      <h2>{title}</h2>
      <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
        {message || 'For your security, please re-enter your account password to continue.'}
      </p>

      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-row">
          <div>
            <label htmlFor="password-confirm-input">Password</label>
            <input
              id="password-confirm-input"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your login password"
            />
          </div>
        </div>

        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={checking}>
            {checking ? 'Checking...' : 'Confirm'}
          </Button>
        </div>
      </form>
    </AnimatedModal>
  );
}

export default PasswordConfirmModal;
