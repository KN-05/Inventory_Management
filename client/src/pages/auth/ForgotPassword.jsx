// src/pages/auth/ForgotPassword.jsx
// PHASE 2: requests a password reset link. Since this project has no
// email-sending service configured, the backend returns the reset link
// directly in the response for local/dev use - see authController.js's
// forgotPassword for where you'd plug in a real email provider.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { forgotPassword } from '../../api/auth';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await forgotPassword(email);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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
        <h1>Forgot Password</h1>

        <p className="auth-hint">
          Enter your account email. If it exists, we'll generate a password reset link.
        </p>

        {error && <p className="form-error">{error}</p>}

        {result ? (
          <>
            <div className="banner banner-success">{result.message}</div>
            {result.devResetUrl && (
              <div className="banner banner-error" style={{ wordBreak: 'break-all' }}>
                <strong>Dev mode</strong> (no email service configured) - your reset link:
                <br />
                <Link to={result.devResetUrl.replace(window.location.origin, '')}>
                  {result.devResetUrl}
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button type="submit" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
