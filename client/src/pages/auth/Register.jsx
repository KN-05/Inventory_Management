// src/pages/auth/Register.jsx
// PHASE 2: this page ONLY ever works for the very first account in the
// system (the bootstrap Admin) - the backend rejects every registration
// attempt after that with a 403, and this page shows that message
// clearly. Every account after the bootstrap Admin must be created by an
// Admin from the Admin Panel (Manager or Staff role).

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      // Show express-validator field errors if present, otherwise the general message
      const message =
        data?.errors?.map((er) => er.message).join(', ') ||
        data?.message ||
        'Registration failed. Please try again.';
      setError(message);
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
        <h1>Register</h1>

        <p className="auth-hint">
          This page only works to create the very first account in the system, which
          automatically becomes <strong>Admin</strong>. If an Admin already exists, ask them
          to create your account from the Admin Panel.
        </p>

        {error && <p className="form-error">{error}</p>}

        <label htmlFor="name">Name</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Register'}
        </button>

        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </motion.form>
    </div>
  );
}

export default Register;
