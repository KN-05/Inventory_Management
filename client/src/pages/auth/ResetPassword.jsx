// src/pages/auth/ResetPassword.jsx
// PHASE 2: the page a user lands on from their reset link
// (/reset-password/:token). Sets a new password using that token.

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { resetPassword } from '../../api/auth';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'This reset link is invalid or has expired');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.form
        className="auth-form"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1>Reset Password</h1>

        {error && <p className="form-error">{error}</p>}

        {success ? (
          <div className="banner banner-success">
            Password reset successful. Redirecting to login...
          </div>
        ) : (
          <>
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />

            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />

            <button type="submit" disabled={submitting}>
              {submitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </>
        )}

        <p>
          <Link to="/login">Back to Login</Link>
        </p>
      </motion.form>
    </div>
  );
}

export default ResetPassword;
