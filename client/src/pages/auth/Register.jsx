// src/pages/auth/Register.jsx
// PHASE 2: this page ONLY ever works for the very first account in the
// system (the bootstrap Admin) - the backend rejects every registration
// attempt after that with a 403, and this page shows that message
// clearly. Every account after the bootstrap Admin must be created by an
// Admin from the Admin Panel (Manager or Staff role).
//
// PHASE 14 (redesign): same split-screen layout + staggered field
// animation as Login.jsx, reusing the same LoginIllustration component
// (with a caption suited to registration instead of login) so the two
// auth pages feel like one consistent flow rather than two different
// designs.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/useAuth';
import LoginIllustration from '../../components/auth/LoginIllustration';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

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
      <motion.div
        className="auth-split-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="auth-split-form-side">
          <motion.form
            className="auth-form"
            onSubmit={handleSubmit}
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div className="auth-brand" variants={item}>
              <span className="auth-brand-mark">IM</span>
              <span className="auth-brand-name">Inventory Manager</span>
            </motion.div>

            <motion.h1 variants={item}>Create your account</motion.h1>
            <motion.p className="auth-hint" variants={item}>
              This page only works to create the very first account in the system, which
              automatically becomes <strong>Admin</strong>. If an Admin already exists, ask
              them to create your account from the Admin Panel.
            </motion.p>

            {error && (
              <motion.p
                className="form-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.p>
            )}

            <motion.div variants={item}>
              <label htmlFor="name">Name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </motion.div>

            <motion.div variants={item}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </motion.div>

            <motion.div variants={item}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </motion.div>

            <motion.button
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
              variants={item}
              whileTap={{ scale: 0.98 }}
            >
              {submitting ? 'Creating account...' : 'Register'}
            </motion.button>

            <motion.p variants={item}>
              Already have an account? <Link to="/login">Login</Link>
            </motion.p>
          </motion.form>
        </div>

        <div className="auth-split-illustration-side">
          <LoginIllustration />
          <div className="auth-illustration-caption">
            <h2>Set up your workspace</h2>
            <p>Create the first Admin account to get started.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Register;
