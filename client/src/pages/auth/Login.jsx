// src/pages/auth/Login.jsx
// PHASE 2: "professional authentication experience" per the spec -
// show/hide password, remember me, and a forgot password link, alongside
// the existing validation/loading/error states.
//
// PHASE 14 (redesign): split-screen layout - the form on the left, an
// animated illustrated panel on the right (see LoginIllustration.jsx) -
// with staggered entrance animation for each field instead of the whole
// form fading in as one block. Purely visual change; all the actual
// login logic below is untouched.
//
// PHASE 15 (Khatabook-inspired visual refresh, LOGIN PAGE ONLY):
// - Clean SaaS look: large rounded white card, light lavender page
//   background, purple/violet primary accent, generous spacing.
// - The right panel is now an ORIGINAL "product dashboard" mockup
//   (stat tiles + mini stock chart + checklist) instead of the old
//   warehouse-shelf illustration, so it reads unmistakably as an
//   Inventory Management System rather than a generic graphic - no
//   Khatabook assets, text, or branding used anywhere.
// - Animation is now a single, fast entrance only (fade/slide/scale on
//   mount). All continuous/"floating" motion has been removed to keep
//   things calm and professional.
// - Every class below is prefixed "login-" and defined fresh in
//   AppStyles.jsx so this redesign is scoped to THIS page only -
//   Register.jsx, ForgotPassword.jsx, and ResetPassword.jsx keep using
//   the original ".auth-*" styles and LoginIllustration.jsx untouched.
// - Auth logic (useAuth, JWT, useNavigate, email/password state,
//   loading/error handling, register/forgot-password links) is
//   IDENTICAL to before - only markup/classNames changed.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/useAuth';

// One shared stagger config so every field/element enters in sequence
// (brand -> heading -> hint -> email -> password -> row -> button -> footer)
// instead of everything appearing at once. Single entrance only - nothing
// here repeats or loops.
const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
};

// Small original icon set (inline SVG, no external assets) used only on
// this page - a package/box mark for the brand, and eye/eye-off glyphs
// for the password toggle.
function BoxIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2L12 3z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 7.2L12 11.4l8-4.2M12 11.4V21" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      {off && <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      // err.response.data.message comes from our backend's errorHandler
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-shell"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ---------------- Left: login form ---------------- */}
        <div className="login-form-side">
          <motion.form
            className="login-form"
            onSubmit={handleSubmit}
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div className="login-brand" variants={item}>
              <span className="login-brand-icon">
                <BoxIcon />
              </span>
              <span className="login-brand-text">Inventory Manager</span>
            </motion.div>

            <motion.h1 className="login-heading" variants={item}>
              Welcome back
            </motion.h1>
            <motion.p className="login-subheading" variants={item}>
              Sign in to manage your inventory, sales, and reports.
            </motion.p>

            {error && (
              <motion.p
                className="login-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.p>
            )}

            <motion.div className="login-field" variants={item}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="login-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </motion.div>

            <motion.div className="login-field" variants={item}>
              <label htmlFor="password">Password</label>
              <div className="login-password-wrap">
                <input
                  id="password"
                  className="login-input login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </motion.div>

            <motion.div className="login-options-row" variants={item}>
              <label className="login-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="login-forgot-link">
                Forgot password?
              </Link>
            </motion.div>

            <motion.button
              type="submit"
              className="login-submit-btn"
              disabled={submitting}
              variants={item}
              whileTap={{ scale: 0.98 }}
            >
              {submitting ? 'Logging in...' : 'Login'}
            </motion.button>

            <motion.p className="login-footer" variants={item}>
              Don't have an account? <Link to="/register">Register</Link>
            </motion.p>
          </motion.form>
        </div>

        {/* ---------------- Right: brand visual (no numbers/data shown) ---------------- */}
        <div className="login-illustration-side">
          <motion.div
            className="login-badge"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <BoxIcon size={40} />
          </motion.div>

          <motion.div
            className="login-illustration-caption"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="login-illustration-title">Run your whole inventory from one place</h2>
            <p className="login-illustration-text">
              Products, purchases, sales, and reports - always in sync.
            </p>
          </motion.div>

          <motion.div
            className="login-pill-row"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="login-pill">Products</span>
            <span className="login-pill">Purchases</span>
            <span className="login-pill">Sales</span>
            <span className="login-pill">Reports</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
