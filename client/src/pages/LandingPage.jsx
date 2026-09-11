// src/pages/LandingPage.jsx
// PHASE 16: new public entry point at "/" shown before the existing
// Login page. Purely a marketing/entry page - no auth logic lives here.
// Clicking "Login" (or any CTA) navigates to the existing /login route,
// which is completely unchanged. Uses the app's existing design tokens
// (--color-primary, --radius, --font-ui, etc. from AppStyles.jsx) so it
// feels consistent with the rest of the product, plus a small set of
// "landing-" prefixed classes scoped to this page only.
//
// PHASE 17: more content + a lot more motion, per feedback that the page
// felt flat. Added: animated background blobs, a capabilities strip, a
// "How it works" 3-step section, and role-based persona cards (Admin /
// Manager / Staff - matching the app's real RBAC, not invented). Every
// section now has its own scroll-reveal, and interactive elements
// (buttons, cards, nav links) have hover motion. Still no fabricated
// business numbers ("500+ users" etc.) - only real product facts.

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const features = [
  {
    icon: '📦',
    title: 'Product Management',
    text: 'Add, organize, and track every product and category in one catalog.',
  },
  {
    icon: '📊',
    title: 'Inventory Tracking',
    text: 'Monitor stock levels in real time and get notified before items run out.',
  },
  {
    icon: '💰',
    title: 'Sales & Purchases',
    text: 'Record sales and purchase orders and keep supplier transactions organized.',
  },
  {
    icon: '📈',
    title: 'Reports',
    text: 'Turn your inventory and sales data into reports you can actually act on.',
  },
];

const capabilities = [
  { icon: '🔐', label: '3 User Roles' },
  { icon: '⚡', label: 'Real-time Stock Alerts' },
  { icon: '🛡️', label: 'JWT Secured Login' },
  { icon: '📑', label: 'Built-in Reports & Analytics' },
];

const steps = [
  {
    number: '01',
    icon: '🗂️',
    title: 'Add your products',
    text: 'Set up categories, suppliers, and starting stock levels for your catalog.',
  },
  {
    number: '02',
    icon: '🔄',
    title: 'Track sales & purchases',
    text: 'Record every transaction and watch stock levels update automatically.',
  },
  {
    number: '03',
    icon: '💡',
    title: 'Get real insights',
    text: 'Check dashboards and reports to see what to reorder and what sells.',
  },
];

const personas = [
  {
    icon: '👑',
    role: 'Admin',
    text: 'Full control of the system - manage users, review activity logs, configure settings, and access every module.',
  },
  {
    icon: '📋',
    role: 'Manager',
    text: 'Handles purchases, runs reports and analytics, and keeps day-to-day inventory operations on track.',
  },
  {
    icon: '🧾',
    role: 'Staff',
    text: 'A focused, simplified dashboard for daily customer billing and sales, without the extra clutter.',
  },
];

function LandingPage() {
  return (
    <div className="landing-page">
      {/* ---------------- Navbar ---------------- */}
      <header className="landing-navbar">
        <div className="landing-navbar-inner">
          <div className="landing-brand">
            <span className="landing-brand-mark">IM</span>
            <span className="landing-brand-text">Inventory Manager</span>
          </div>
          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#about">About</a>
          </nav>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link to="/login" className="landing-nav-login-btn">
              Login
            </Link>
          </motion.div>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="landing-hero">
        {/* Slow, continuous, purely decorative background blobs - the
            only "floating" motion on this page, kept behind the content
            so it adds energy without distracting from anything readable. */}
        <motion.span
          className="landing-blob landing-blob-1"
          animate={{ x: [0, 24, 0], y: [0, -18, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className="landing-blob landing-blob-2"
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="landing-hero-content"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.span className="landing-eyebrow" variants={fadeUp}>
            Inventory Management System
          </motion.span>
          <motion.h1 className="landing-hero-title" variants={fadeUp}>
            Manage Your Inventory Smarter
          </motion.h1>
          <motion.p className="landing-hero-text" variants={fadeUp}>
            Track products, stock, purchases, sales and reports from one powerful,
            easy-to-use platform built for growing businesses.
          </motion.p>
          <motion.div className="landing-hero-actions" variants={fadeUp}>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link to="/login" className="landing-btn-primary">
                Login
              </Link>
            </motion.div>
            <motion.a
              href="#features"
              className="landing-btn-secondary"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              Learn More
            </motion.a>
          </motion.div>
        </motion.div>

        <motion.div
          className="landing-hero-visual"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Original app-preview mockup (browser frame around a mini
              replica of our own Dashboard - sidebar + stat cards + charts).
              No external image, no Khatabook assets - built purely from
              our own product's layout and color tokens. A slow "breathing"
              scale keeps it feeling alive; bars/donut animate in once. */}
          <motion.div
            className="landing-mockup-frame"
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
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
                      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="landing-mockup-stat">
                    <span className="landing-mockup-stat-label">Low Stock</span>
                    <motion.span
                      className="landing-mockup-stat-bar"
                      initial={{ width: 0 }}
                      animate={{ width: '40%' }}
                      transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="landing-mockup-stat">
                    <span className="landing-mockup-stat-label">Suppliers</span>
                    <motion.span
                      className="landing-mockup-stat-bar"
                      initial={{ width: 0 }}
                      animate={{ width: '55%' }}
                      transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="landing-mockup-stat">
                    <span className="landing-mockup-stat-label">Stock Value</span>
                    <motion.span
                      className="landing-mockup-stat-bar"
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>

                <div className="landing-mockup-charts">
                  <motion.div
                    className="landing-mockup-donut"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                  />
                  <div className="landing-mockup-bars">
                    {[40, 70, 55, 90, 35].map((h, i) => (
                      <motion.span
                        key={h}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.6, delay: 0.9 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="landing-mockup-float-badge"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: [10, 0, -4, 0] }}
            transition={{
              opacity: { duration: 0.4, delay: 0.4 },
              y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
            }}
          >
            <span className="landing-mockup-float-dot" />
            Real-time inventory sync
          </motion.div>
        </motion.div>
      </section>

      {/* ---------------- Capabilities strip ---------------- */}
      <motion.section
        className="landing-capabilities"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
      >
        {capabilities.map((c) => (
          <motion.div
            className="landing-capability"
            key={c.label}
            variants={fadeUp}
            whileHover={{ y: -3 }}
          >
            <span className="landing-capability-icon">{c.icon}</span>
            {c.label}
          </motion.div>
        ))}
      </motion.section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="landing-features">
        <motion.span
          className="landing-eyebrow landing-eyebrow-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.35 }}
        >
          Features
        </motion.span>
        <motion.h2
          className="landing-section-title"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          Everything you need to run your inventory
        </motion.h2>

        <motion.div
          className="landing-feature-grid"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {features.map((f) => (
            <motion.div
              className="landing-feature-card"
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -6, boxShadow: '0 16px 30px -10px rgba(124, 58, 237, 0.25)' }}
            >
              <motion.span
                className="landing-feature-icon"
                whileHover={{ rotate: 10, scale: 1.15 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {f.icon}
              </motion.span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how-it-works" className="landing-steps">
        <motion.span
          className="landing-eyebrow landing-eyebrow-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.35 }}
        >
          How it works
        </motion.span>
        <motion.h2
          className="landing-section-title"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          Up and running in three steps
        </motion.h2>

        <motion.div
          className="landing-steps-row"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {steps.map((s, i) => (
            <motion.div className="landing-step-card" key={s.number} variants={fadeUp}>
              <span className="landing-step-number">{s.number}</span>
              <motion.span
                className="landing-step-icon"
                whileHover={{ scale: 1.15, rotate: -6 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {s.icon}
              </motion.span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              {i < steps.length - 1 && (
                <motion.span
                  className="landing-step-connector"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
                />
              )}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ---------------- About / roles ---------------- */}
      <section id="about" className="landing-about">
        <motion.div
          className="landing-about-inner"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.35 }}
        >
          <span className="landing-eyebrow landing-eyebrow-center">About</span>
          <h2 className="landing-section-title">Built for teams who manage real inventory</h2>
          <p className="landing-about-text">
            Inventory Manager brings products, suppliers, purchases, sales, and
            reporting into a single dashboard, with role-based access so
            everyone sees exactly what they need to do their job.
          </p>
        </motion.div>

        <motion.div
          className="landing-persona-grid"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {personas.map((p) => (
            <motion.div
              className="landing-persona-card"
              key={p.role}
              variants={fadeUp}
              whileHover={{ y: -5 }}
            >
              <span className="landing-persona-icon">{p.icon}</span>
              <h3>{p.role}</h3>
              <p>{p.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ---------------- CTA banner ---------------- */}
      <section className="landing-cta">
        <motion.div
          className="landing-cta-inner"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.35 }}
        >
          <h2>Ready to manage your inventory smarter?</h2>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link to="/login" className="landing-btn-primary landing-btn-light">
              Login to your account
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-brand">
            <span className="landing-brand-mark">IM</span>
            <span className="landing-brand-text">Inventory Manager</span>
          </div>
          <nav className="landing-footer-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#about">About</a>
            <Link to="/login">Login</Link>
          </nav>
          <p className="landing-footer-copy">
            © {new Date().getFullYear()} Inventory Manager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
