// src/pages/auth/Login.jsx
// The sign-in page now starts with TWO clear choices:
//
//   1. New user      - create a business account (Google or e-mail), then the
//                      onboarding steps (business details -> plan -> start).
//   2. Existing user - sign in (Google, or the existing e-mail + password form).
//
// Every sub-screen has a Back button to the choice screen. The e-mail/password
// login, remember-me, forgot-password link, validation and error handling are
// the same as before; the split-screen layout and illustration are unchanged.
//
// After ANY successful sign-in the SERVER says where the person belongs
// (`next`): the dashboard, the unfinished onboarding, or the renewal page.
// An existing user is never sent through sign-up again.

import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/useAuth';
import { googleAuth, signupWithEmail } from '../../api/auth';
import GoogleButton from '../../components/auth/GoogleButton';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
};

const PAGE_AFTER_LOGIN = { onboarding: '/onboarding', renew: '/renew' };

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

function BackButton({ onClick }) {
  return (
    <button type="button" className="auth-back-btn" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}

function Brand() {
  return (
    <motion.div className="login-brand" variants={item}>
      <span className="login-brand-icon">
        <BoxIcon />
      </span>
      <span className="login-brand-text">Inventory Manager</span>
    </motion.div>
  );
}

function Divider({ children }) {
  return (
    <motion.div className="auth-divider" variants={item} role="separator">
      <span>{children}</span>
    </motion.div>
  );
}

function PasswordField({ id, label, value, onChange, placeholder, autoComplete, show, onToggle, minLength }) {
  return (
    <motion.div className="login-field" variants={item}>
      <label htmlFor={id}>{label}</label>
      <div className="login-password-wrap">
        <input
          id={id}
          className="login-input login-password-input"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minLength={minLength}
          required
        />
        <button
          type="button"
          className="login-password-toggle"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <EyeIcon off={show} />
        </button>
      </div>
    </motion.div>
  );
}

function Login() {
  const [params] = useSearchParams();
  const initialView = params.get('mode') === 'new' ? 'new' : params.get('mode') === 'existing' ? 'existing' : 'choose';
  const [view, setView] = useState(initialView); // 'choose' | 'new' | 'existing'
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false); // blocks double submits (any flow)

  // existing user
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // new user
  const [name, setName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { login, startSession } = useAuth();
  const navigate = useNavigate();

  const goTo = (nextView) => {
    setError('');
    setView(nextView);
  };

  const finish = (data) => navigate(PAGE_AFTER_LOGIN[data.next] || '/dashboard', { replace: true });

  // ----- existing user: e-mail + password (unchanged behaviour) -----
  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const data = await login(email, password, rememberMe);
      finish(data);
    } catch (err) {
      // err.response.data.message comes from our backend's errorHandler
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----- new user: e-mail + password sign-up -----
  const handleSignup = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (newPassword.length < 8) {
      setError('Choose a password of at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await signupWithEmail(name.trim(), newEmail.trim(), newPassword);
      startSession(data, true);
      finish(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Google (both sides) - the SERVER verifies the credential -----
  const handleGoogle = async (credential, intent) => {
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const data = await googleAuth(credential, intent);
      startSession(data, true);
      finish(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request ? 'Could not reach the server. Check your connection and try again.' : 'Google sign-in failed. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const errorBox = error && (
    <motion.p className="login-error" role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      {error}
    </motion.p>
  );

  return (
    <div className="login-page">
      <motion.div
        className="login-shell"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ---------------- Left: choose / new user / existing user ---------------- */}
        <div className="login-form-side">
          {view === 'choose' && (
            <motion.div key="choose" className="login-form" variants={container} initial="hidden" animate="show">
              <Brand />
              <motion.h1 className="login-heading" variants={item}>
                Welcome
              </motion.h1>
              <motion.p className="login-subheading" variants={item}>
                Are you starting fresh, or do you already have an account?
              </motion.p>

              <motion.button type="button" className="auth-choice" variants={item} onClick={() => goTo('new')}>
                <span className="auth-choice-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                    <path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="auth-choice-text">
                  <strong>New user</strong>
                  <span>Create a business account</span>
                  <em>Set up your business, pick a plan and start a free trial.</em>
                </span>
                <span className="auth-choice-arrow" aria-hidden="true">
                  &rsaquo;
                </span>
              </motion.button>

              <motion.button type="button" className="auth-choice" variants={item} onClick={() => goTo('existing')}>
                <span className="auth-choice-icon auth-choice-icon--alt" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                    <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="auth-choice-text">
                  <strong>Existing user</strong>
                  <span>Sign in to your account</span>
                  <em>Go straight to your dashboard. No sign-up or plan needed.</em>
                </span>
                <span className="auth-choice-arrow" aria-hidden="true">
                  &rsaquo;
                </span>
              </motion.button>
            </motion.div>
          )}

          {view === 'new' && (
            <motion.form key="new" className="login-form" onSubmit={handleSignup} variants={container} initial="hidden" animate="show">
              <motion.div variants={item}>
                <BackButton onClick={() => goTo('choose')} />
              </motion.div>
              <Brand />
              <motion.h1 className="login-heading" variants={item}>
                Create your business account
              </motion.h1>
              <motion.p className="login-subheading" variants={item}>
                Step 1 of 3 - sign up. Next you will add your business details and choose a plan.
              </motion.p>

              {errorBox}

              <motion.div variants={item}>
                <GoogleButton intent="signup" disabled={submitting} onCredential={(c) => handleGoogle(c, 'signup')} />
              </motion.div>

              <Divider>or sign up with e-mail</Divider>

              <motion.div className="login-field" variants={item}>
                <label htmlFor="signup-name">Your name</label>
                <input
                  id="signup-name"
                  className="login-input"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  minLength={2}
                  maxLength={60}
                  required
                />
              </motion.div>
              <motion.div className="login-field" variants={item}>
                <label htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  className="login-input"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </motion.div>
              <PasswordField
                id="signup-password"
                label="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                show={showNewPassword}
                onToggle={() => setShowNewPassword((v) => !v)}
                minLength={8}
              />

              <motion.button type="submit" className="login-submit-btn" disabled={submitting} variants={item} whileTap={{ scale: 0.98 }}>
                {submitting ? 'Creating account...' : 'Continue'}
              </motion.button>

              <motion.p className="login-footer" variants={item}>
                Already have an account?{' '}
                <button type="button" className="auth-link-btn" onClick={() => goTo('existing')}>
                  Sign in
                </button>
              </motion.p>
            </motion.form>
          )}

          {view === 'existing' && (
            <motion.form key="existing" className="login-form" onSubmit={handleLogin} variants={container} initial="hidden" animate="show">
              <motion.div variants={item}>
                <BackButton onClick={() => goTo('choose')} />
              </motion.div>
              <Brand />
              <motion.h1 className="login-heading" variants={item}>
                Welcome back
              </motion.h1>
              <motion.p className="login-subheading" variants={item}>
                Sign in to manage your inventory, sales, and reports.
              </motion.p>

              {errorBox}

              <motion.div variants={item}>
                <GoogleButton intent="signin" disabled={submitting} onCredential={(c) => handleGoogle(c, 'signin')} />
              </motion.div>

              <Divider>or sign in with e-mail</Divider>

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

              <PasswordField
                id="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />

              <motion.div className="login-options-row" variants={item}>
                <label className="login-checkbox">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  Remember me
                </label>
                <Link to="/forgot-password" className="login-forgot-link">
                  Forgot password?
                </Link>
              </motion.div>

              <motion.button type="submit" className="login-submit-btn" disabled={submitting} variants={item} whileTap={{ scale: 0.98 }}>
                {submitting ? 'Logging in...' : 'Login'}
              </motion.button>

              <motion.p className="login-footer" variants={item}>
                New here?{' '}
                <button type="button" className="auth-link-btn" onClick={() => goTo('new')}>
                  Create a business account
                </button>
              </motion.p>
            </motion.form>
          )}
        </div>

        {/* ---------------- Right: brand visual (no numbers/data shown) ---------------- */}
        <div className="login-illustration-side">
          {/* PHASE 4 polish: reuses the landing page's own dashboard-mockup
              markup/classes (compact variant) instead of a plain icon
              badge, so the login panel feels as rich/finished as the
              marketing page. Single entrance only - no continuous
              breathing/floating motion, matching this page's calmer
              animation philosophy. */}
          <motion.div
            className="landing-mockup-frame landing-mockup-frame--compact"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="landing-mockup-topbar">
              <span className="landing-mockup-dot" style={{ background: '#f87171' }} />
              <span className="landing-mockup-dot" style={{ background: '#fbbf24' }} />
              <span className="landing-mockup-dot" style={{ background: '#4ade80' }} />
              <span className="landing-mockup-url">Inventory Manager</span>
            </div>
            <div className="landing-mockup-body">
              <div className="landing-mockup-sidebar">
                <span className="landing-mockup-sidebar-brand">IM</span>
                <span className="landing-mockup-sidebar-link landing-mockup-sidebar-link-active" />
                <span className="landing-mockup-sidebar-link" />
                <span className="landing-mockup-sidebar-link" />
                <span className="landing-mockup-sidebar-link" />
              </div>
              <div className="landing-mockup-content">
                <span className="landing-mockup-title-bar" />
                <div className="landing-mockup-stat-grid">
                  <div className="landing-mockup-stat">
                    <span className="landing-mockup-stat-label">Products</span>
                    <motion.span
                      className="landing-mockup-stat-bar"
                      initial={{ width: 0 }}
                      animate={{ width: '70%' }}
                      transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="landing-mockup-stat">
                    <span className="landing-mockup-stat-label">Low Stock</span>
                    <motion.span
                      className="landing-mockup-stat-bar"
                      initial={{ width: 0 }}
                      animate={{ width: '40%' }}
                      transition={{ duration: 0.7, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
                <div className="landing-mockup-charts">
                  <motion.div
                    className="landing-mockup-donut"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                  />
                  <div className="landing-mockup-bars">
                    {[40, 70, 55, 90, 35].map((h, i) => (
                      <motion.span
                        key={h}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.5, delay: 0.5 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
