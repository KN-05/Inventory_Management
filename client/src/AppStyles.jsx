// src/AppStyles.jsx
// PHASE 14 (per explicit request): ALL styling for this app is defined
// and delivered from a React component - there is no .css file anywhere
// in this project anymore. This component holds the entire design
// system (previously index.css) as a plain JS string, and injects it
// into the document via a <style> tag when it mounts - the same
// mechanism CSS-in-JS libraries like styled-components use internally,
// just written by hand with zero extra npm dependencies.
//
// Rendered once, at the very top of the component tree (see main.jsx),
// so these rules are available before any other component paints.
// The CSS content itself is UNCHANGED from before - every color,
// spacing value, role theme (admin/manager/staff), hover state, and
// mobile breakpoint behaves exactly as it did - only *where* the rules
// live (a JS string inside a React component, not a separate file) has
// changed.

const CSS = `
/* src/index.css
   Phase 1 (revised) — "G+F combo" design pass: soft neumorphic content
   surfaces (dual-shadow, borderless cards) paired with a gradient sidebar
   per role, plus hover-lift, entrance, and press-feedback animations.

   Design system in short:
   - Content area: a soft neumorphic light-gray canvas (#eef1f5). Cards,
     stat tiles, and badges use a light "raised" dual-shadow instead of a
     hard border - one shadow going dark-down-right, one light-up-left,
     against the same background colour as the page. This means cards
     read as physically raised without adding visual clutter (no border
     lines competing with table borders, etc).
   - Sidebar: a deep gradient per role (purple→navy for Admin, teal→blue
     for Manager, amber→brown for Staff) instead of a flat dark colour -
     the one deliberately rich surface in an otherwise restrained UI.
   - Buttons: primary actions use a gradient fill matching the sidebar,
     with a soft colour-matched glow shadow.
   - Motion: cards lift on hover, page sections fade/slide in on mount,
     buttons give a small press-scale on click. All via CSS transitions/
     keyframes - no animation library needed.
   - Inter for UI text; JetBrains Mono for anything that reads like a
     warehouse record - SKUs, quantities, prices, stat numbers. */

:root {
  /* Color */
  --color-bg: #eef1f5;
  --color-surface: #eef1f5;
  --color-border: #dde1e8;
  --color-text: #1e2433;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;

  --color-primary: #7c3aed;
  --color-primary-hover: #6d28d9;
  --color-primary-bg: #f3ebfe;
  --color-primary-gradient: linear-gradient(90deg, #7c3aed, #a855f7);

  --color-success: #0d9488;
  --color-success-bg: #eef1f5;
  --color-success-border: #99f6e4;

  --color-warning: #c2410c;
  --color-warning-bg: #eef1f5;
  --color-warning-border: #fed7aa;

  --color-danger: #be123c;
  --color-danger-bg: #eef1f5;
  --color-danger-border: #fecdd3;

  --sidebar-gradient: linear-gradient(180deg, #4c1d95, #1e1b4b);
  --sidebar-bg-active: rgba(255, 255, 255, 0.15);
  --sidebar-text: #c4b5fd;
  --sidebar-text-active: #ffffff;
  --sidebar-section-label: #a78bfa;
  --sidebar-accent: #ffffff;

  /* Neumorphic shadow pair - dark stop first (bottom-right), light stop
     second (top-left). Both stops are derived from --color-bg so the
     effect works whatever the page background is. */
  --neu-shadow: 3px 3px 6px #cbd2dd, -3px -3px 6px #ffffff;
  --neu-shadow-inset: inset 1px 1px 2px #cbd2dd, inset -1px -1px 2px #ffffff;
  --neu-shadow-lg: 6px 6px 14px #c6cdd9, -6px -6px 14px #ffffff;

  /* Type */
  --font-ui: 'Inter', system-ui, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace;

  /* Layout */
  --radius: 10px;
  --radius-sm: 8px;
  --sidebar-width: 240px;
  --navbar-height: 60px;

  /* Motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 0.15s;
  --dur-base: 0.25s;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-fast: 0.001ms;
    --dur-base: 0.001ms;
  }
}

/* ==========================================================================
   Shared animation keyframes
   ========================================================================== */
/* NOTE: entrance/hover/press animations (cards, rows, modals, toasts,
   buttons) now live in React via Framer Motion - see StatCard.jsx,
   ProductTable.jsx, AnimatedModal.jsx, Button.jsx, ToastContext.jsx, etc.
   Only continuous/decorative CSS animations remain here (spinner, shimmer
   skeleton) since those aren't tied to a mount/interaction event. */
@keyframes shimmer {
  0% {
    background-position: -300px 0;
  }
  100% {
    background-position: 300px 0;
  }
}

/* ==========================================================================
   Per-role visual themes
   ==========================================================================
   Only the colour/gradient tokens change between roles - the neumorphic
   surface treatment, spacing, typography, and radii stay identical. This
   keeps the app feeling like ONE consistent product with three colour
   identities, not three different apps.

   Scoped to [data-theme="..."] on .app-shell (set in DashboardLayout.jsx
   from the logged-in user's role), so these never apply to the public
   Login/Register pages, which use the default (:root / admin) purple as a
   neutral pre-login brand colour.

   'manager' has no corresponding role in the database yet - that's
   introduced in Phase 2 (Authentication + Role System) - but the theme is
   defined now and will apply automatically the moment that role exists,
   with zero extra frontend work needed. */

/* Admin - purple → navy gradient: authority, control, system management */
.app-shell[data-theme='admin'] {
  --color-primary: #7c3aed;
  --color-primary-hover: #6d28d9;
  --color-primary-bg: #f3ebfe;
  --color-primary-gradient: linear-gradient(90deg, #7c3aed, #a855f7);
  --sidebar-gradient: linear-gradient(180deg, #4c1d95, #1e1b4b);
  --sidebar-text: #c4b5fd;
  --sidebar-section-label: #a78bfa;
}

/* Manager/Accountant - teal → blue gradient: finance, operations, inventory */
.app-shell[data-theme='manager'] {
  --color-primary: #0d9488;
  --color-primary-hover: #0f766e;
  --color-primary-bg: #e6fbf8;
  --color-primary-gradient: linear-gradient(90deg, #0d9488, #0ea5e9);
  --sidebar-gradient: linear-gradient(180deg, #0d9488, #0c4a6e);
  --sidebar-text: #99f6e4;
  --sidebar-section-label: #5eead4;
}

/* Staff - amber → brown gradient: daily operations, sales, quick actions */
.app-shell[data-theme='staff'] {
  --color-primary: #d97706;
  --color-primary-hover: #b45309;
  --color-primary-bg: #fef3e2;
  --color-primary-gradient: linear-gradient(90deg, #d97706, #f59e0b);
  --sidebar-gradient: linear-gradient(180deg, #92400e, #451a03);
  --sidebar-text: #fed7aa;
  --sidebar-section-label: #fdba74;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--font-ui);
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}

#root {
  min-height: 100vh;
}

button {
  cursor: pointer;
  font-family: inherit;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}

/* ==========================================================================
   Auth pages (Login/Register) - outside the app shell
   ========================================================================== */
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--color-bg);
  background-image: radial-gradient(
      circle at 15% 15%,
      color-mix(in srgb, var(--color-primary) 10%, transparent),
      transparent 40%
    ),
    radial-gradient(
      circle at 85% 85%,
      color-mix(in srgb, var(--color-primary) 8%, transparent),
      transparent 40%
    );
}

/* PHASE 14 (login redesign): split-screen layout - form on the left,
   an illustrated gradient panel on the right (hidden on narrow screens,
   where there's no room for a decorative panel next to the form). */
.auth-split-card {
  width: 100%;
  max-width: 880px;
  min-height: 560px;
  display: flex;
  background: var(--color-surface);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: var(--neu-shadow-lg);
}

.auth-split-form-side {
  flex: 1 1 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem;
  min-width: 0;
}

.auth-split-illustration-side {
  flex: 1 1 50%;
  position: relative;
  background: var(--sidebar-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

@media (max-width: 760px) {
  .auth-split-illustration-side {
    display: none;
  }
  .auth-split-form-side {
    padding: 1.75rem;
  }
}

.auth-floating-shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.auth-illustration-caption {
  position: absolute;
  bottom: 2rem;
  left: 2rem;
  right: 2rem;
  color: #fff;
  text-align: center;
}

.auth-illustration-caption h2 {
  margin: 0 0 0.35rem;
  font-size: 1.3rem;
}

.auth-illustration-caption p {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.85;
}

.auth-form {
  width: 100%;
  max-width: 360px;
  background: transparent;
  border-radius: var(--radius);
  padding: 0;
  display: flex;
  flex-direction: column;
  box-shadow: none;
}

/* BUGFIX: ForgotPassword.jsx/ResetPassword.jsx use just ".auth-form"
   directly inside ".auth-page" (no split-card wrapper like Login/
   Register), which relied on ".auth-form" ITSELF providing the visible
   card (background/padding/shadow). That card styling moved to
   ".auth-split-card"/".auth-split-form-side" when Login was redesigned,
   which silently broke these two pages (no visible card, no padding).
   Add this second class alongside "auth-form" to restore a standalone
   card look for pages that don't use the split layout. */
.auth-standalone-card {
  background: var(--color-surface);
  padding: 2rem;
  box-shadow: var(--neu-shadow-lg);
}

.auth-form h1 {
  margin: 0 0 1.25rem;
  font-size: 1.5rem;
  letter-spacing: -0.01em;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.auth-brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--color-primary-gradient);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
}

.auth-brand-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text);
}

.auth-hint {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background: var(--color-primary-bg);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.75rem;
  margin: 0 0 1rem;
  line-height: 1.4;
}

.password-field {
  position: relative;
  display: flex;
}

.password-field input {
  flex: 1;
  padding-right: 3.2rem;
}

.password-toggle {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  margin: 0;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  box-shadow: none;
  color: var(--color-primary);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
}

.password-toggle:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.auth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.75rem;
  font-size: 0.82rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 400;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
  box-shadow: none;
  cursor: pointer;
}

.auth-link-small {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
}

.auth-link-small:hover {
  text-decoration: underline;
}

.auth-form label {
  font-size: 0.85rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
}

.auth-form input,
.auth-form select {
  padding: 0.55rem 0.65rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-family: inherit;
  background: var(--color-bg);
  box-shadow: var(--neu-shadow-inset);
  transition: box-shadow var(--dur-fast) ease;
}

/* BUGFIX: this used to be ".auth-form button", which matched EVERY
   button inside the form - including the small password Show/Hide
   toggle - giving it this same purple gradient/padding/margin-top and
   making it look like a big detached pill floating above the password
   field. Scoped to a dedicated class so it only styles the actual
   submit button. */
.auth-submit-btn {
  margin-top: 1.25rem;
  padding: 0.65rem;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary-gradient);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  box-shadow: 0 3px 10px color-mix(in srgb, var(--color-primary) 35%, transparent);
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) ease;
}

.auth-submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 5px 16px color-mix(in srgb, var(--color-primary) 45%, transparent);
}

.auth-submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.auth-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-form p {
  margin-top: 1rem;
  font-size: 0.9rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.auth-form a {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
}

.form-error {
  background: var(--color-bg);
  box-shadow: var(--neu-shadow-inset);
  color: var(--color-danger);
  border-left: 3px solid var(--color-danger);
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  margin: 0 0 0.5rem;
}

/* ==========================================================================
   PHASE 15: Login page redesign (Khatabook-inspired reference, scoped
   ONLY to Login.jsx via "login-" prefixed classes)
   ==========================================================================
   Nothing here touches ".auth-*" (still used unchanged by Register,
   ForgotPassword, ResetPassword) or any app-shell/dashboard rule. Visual
   direction taken from the Khatabook reference screenshots - light
   lavender page background, a large rounded white card, a purple/violet
   primary accent, generous spacing, soft single-layer shadows - rebuilt
   from scratch with original inventory-management content (no Khatabook
   text, images, or logos). Motion is a single fast entrance only; there
   is no continuous/floating animation anywhere in this block. */

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: #f5f3ff;
  background-image: radial-gradient(circle at 12% 8%, #ede9fe 0%, transparent 45%),
    radial-gradient(circle at 88% 92%, #ede9fe 0%, transparent 45%);
}

.login-shell {
  width: 100%;
  max-width: 940px;
  min-height: 580px;
  display: flex;
  background: #ffffff;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 30px 60px -20px rgba(76, 29, 149, 0.18), 0 2px 8px rgba(15, 23, 42, 0.04);
}

.login-form-side {
  flex: 1 1 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 3rem;
  min-width: 0;
}

.login-form {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 1.75rem;
}

.login-brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  box-shadow: 0 4px 10px rgba(124, 58, 237, 0.35);
}

.login-brand-text {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1e2433;
  letter-spacing: -0.01em;
}

.login-heading {
  margin: 0 0 0.4rem;
  font-size: 1.7rem;
  font-weight: 700;
  color: #1e2433;
  letter-spacing: -0.02em;
}

.login-subheading {
  margin: 0 0 1.75rem;
  font-size: 0.92rem;
  line-height: 1.5;
  color: #6b7280;
}

.login-error {
  background: #fef2f2;
  color: #be123c;
  border-left: 3px solid #be123c;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  font-size: 0.85rem;
  margin: 0 0 1rem;
}

.login-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.1rem;
}

.login-field label {
  font-size: 0.83rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.4rem;
}

.login-input {
  padding: 0.75rem 0.9rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  font-size: 0.95rem;
  font-family: inherit;
  background: #f9fafb;
  color: #1e2433;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.login-input::placeholder {
  color: #9ca3af;
}

.login-input:focus {
  outline: none;
  border-color: #7c3aed;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.12);
}

.login-password-wrap {
  position: relative;
  display: flex;
}

.login-password-input {
  flex: 1;
  padding-right: 2.75rem;
}

.login-password-toggle {
  position: absolute;
  right: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.login-password-toggle:hover {
  color: #7c3aed;
  background: #f3ebfe;
}

.login-options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  font-size: 0.85rem;
}

.login-checkbox {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #6b7280;
  cursor: pointer;
  user-select: none;
}

.login-checkbox input {
  width: 15px;
  height: 15px;
  accent-color: #7c3aed;
  cursor: pointer;
}

.login-forgot-link {
  color: #7c3aed;
  font-weight: 600;
  text-decoration: none;
}

.login-forgot-link:hover {
  text-decoration: underline;
}

.login-submit-btn {
  padding: 0.8rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(90deg, #7c3aed, #a855f7);
  color: #fff;
  font-size: 0.98rem;
  font-weight: 600;
  box-shadow: 0 10px 20px -6px rgba(124, 58, 237, 0.45);
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.login-submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px -6px rgba(124, 58, 237, 0.55);
}

.login-submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.login-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 1.4rem;
  font-size: 0.88rem;
  text-align: center;
  color: #6b7280;
}

.login-footer a {
  color: #7c3aed;
  font-weight: 600;
  text-decoration: none;
}

.login-footer a:hover {
  text-decoration: underline;
}

/* ---------------- Right side: inventory dashboard mockup ---------------- */

.login-illustration-side {
  flex: 1 1 50%;
  position: relative;
  background: linear-gradient(160deg, #6d28d9 0%, #4c1d95 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.75rem;
  padding: 2.5rem;
  overflow: hidden;
}

/* Clean, no-fake-data brand panel: an icon badge, headline copy, and a
   row of feature "pills" naming what the system covers - no numbers,
   no mock dashboard content. */
.login-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
}

.login-illustration-caption {
  text-align: center;
  max-width: 320px;
}

.login-pill-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  max-width: 320px;
}

.login-pill {
  font-size: 0.78rem;
  font-weight: 600;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
}

.login-illustration-title {
  margin: 0 0 0.4rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.login-illustration-text {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
}

/* Tablet: compact two columns - tighter padding, smaller card min-height */
@media (max-width: 900px) {
  .login-shell {
    max-width: 720px;
    min-height: 0;
  }
  .login-form-side {
    padding: 2.25rem 2rem;
  }
  .login-illustration-side {
    padding: 2rem 1.5rem;
    gap: 1.25rem;
  }
  .login-badge {
    width: 68px;
    height: 68px;
  }
}

/* Mobile: form first, illustration hidden - no horizontal scrolling */
@media (max-width: 760px) {
  .login-page {
    padding: 1rem;
  }
  .login-shell {
    flex-direction: column;
    border-radius: 22px;
  }
  .login-illustration-side {
    display: none;
  }
  .login-form-side {
    padding: 2rem 1.5rem;
  }
  .login-form {
    max-width: none;
  }
}

/* ==========================================================================
   PHASE 16: Landing / starting page (public, shown at "/" before Login)
   ==========================================================================
   Scoped entirely to "landing-" prefixed classes, so nothing here can
   affect Login, Register, the dashboard, or any other existing page.
   Reuses the app's shared design tokens (--color-primary, --radius,
   --font-ui, --neu-shadow, etc.) so it feels like the same product
   rather than a bolted-on marketing page. */

.landing-page {
  font-family: var(--font-ui);
  color: var(--color-text);
  background: #ffffff;
}

.landing-navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border);
}

.landing-navbar-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.landing-brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.landing-brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-primary-gradient);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
}

.landing-brand-text {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-text);
}

.landing-nav-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.landing-nav-links a {
  position: relative;
  color: var(--color-text-secondary);
  text-decoration: none;
}

.landing-nav-links a::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -4px;
  width: 100%;
  height: 2px;
  background: var(--color-primary);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur-fast) var(--ease-out);
}

.landing-nav-links a:hover {
  color: var(--color-primary);
}

.landing-nav-links a:hover::after {
  transform: scaleX(1);
}

.landing-nav-login-btn {
  background: var(--color-primary-gradient);
  color: #fff;
  font-weight: 600;
  font-size: 0.88rem;
  padding: 0.55rem 1.2rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  box-shadow: 0 3px 10px color-mix(in srgb, var(--color-primary) 35%, transparent);
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) ease;
}

.landing-nav-login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 16px color-mix(in srgb, var(--color-primary) 45%, transparent);
}

/* ---------------- Hero ---------------- */

.landing-hero {
  max-width: 1120px;
  margin: 0 auto;
  padding: 4.5rem 1.5rem 5rem;
  display: flex;
  align-items: center;
  gap: 3rem;
  position: relative;
  overflow: hidden;
}

/* Decorative, continuously-animated background blobs (see JSX comment) -
   purely visual, sit behind everything, ignored by pointer events. */
.landing-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(50px);
  opacity: 0.35;
  pointer-events: none;
  z-index: 0;
}

.landing-blob-1 {
  width: 320px;
  height: 320px;
  top: -80px;
  right: 4%;
  background: radial-gradient(circle, var(--color-primary) 0%, transparent 70%);
}

.landing-blob-2 {
  width: 260px;
  height: 260px;
  bottom: -60px;
  left: 2%;
  background: radial-gradient(circle, #a855f7 0%, transparent 70%);
}

.landing-hero-content,
.landing-hero-visual {
  position: relative;
  z-index: 1;
}

.landing-hero-content {
  flex: 1 1 52%;
  min-width: 0;
}

.landing-eyebrow {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  margin-bottom: 1.1rem;
}

.landing-eyebrow-center {
  display: block;
  width: fit-content;
  margin: 0 auto 0.75rem;
}

.landing-hero-title {
  margin: 0 0 1rem;
  font-size: 2.9rem;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.landing-hero-text {
  margin: 0 0 2rem;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  max-width: 480px;
}

.landing-hero-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.landing-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-gradient);
  color: #fff;
  font-weight: 600;
  font-size: 0.98rem;
  padding: 0.85rem 1.75rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  box-shadow: 0 10px 20px -6px color-mix(in srgb, var(--color-primary) 45%, transparent);
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) ease;
}

.landing-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px -6px color-mix(in srgb, var(--color-primary) 55%, transparent);
}

.landing-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: var(--color-text);
  font-weight: 600;
  font-size: 0.98rem;
  padding: 0.85rem 1.75rem;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--color-border);
  text-decoration: none;
  transition: border-color var(--dur-fast) ease, color var(--dur-fast) ease;
}

.landing-btn-secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.landing-hero-visual {
  flex: 1 1 48%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

/* Original browser-frame mockup of our own Dashboard (sidebar + stat
   cards + charts) - built from CSS shapes only, no external image and
   no Khatabook assets. Slight tilt for the "floating screenshot" feel
   seen on real SaaS marketing pages. */
.landing-mockup-frame {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 30px 60px -20px rgba(76, 29, 149, 0.35), 0 2px 8px rgba(15, 23, 42, 0.06);
  transform: rotate(-1.5deg);
  border: 1px solid var(--color-border);
}

.landing-mockup-topbar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.8rem;
  background: #f9fafb;
  border-bottom: 1px solid var(--color-border);
}

.landing-mockup-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.landing-mockup-url {
  margin-left: 0.5rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.15rem 0.7rem;
}

.landing-mockup-body {
  display: flex;
  min-height: 260px;
}

.landing-mockup-sidebar {
  width: 20%;
  background: var(--sidebar-gradient);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 0;
}

.landing-mockup-sidebar-brand {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 0.55rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.4rem;
}

.landing-mockup-sidebar-link {
  width: 65%;
  height: 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
}

.landing-mockup-sidebar-link-active {
  background: rgba(255, 255, 255, 0.75);
}

.landing-mockup-content {
  flex: 1;
  padding: 0.9rem 1rem 1.1rem;
  min-width: 0;
}

.landing-mockup-title-bar {
  display: block;
  width: 40%;
  height: 10px;
  border-radius: 4px;
  background: var(--color-text);
  opacity: 0.85;
  margin-bottom: 0.9rem;
}

.landing-mockup-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  margin-bottom: 1rem;
}

.landing-mockup-stat {
  background: var(--color-bg);
  border-radius: 8px;
  padding: 0.5rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.landing-mockup-stat-label {
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.landing-mockup-stat-bar {
  display: block;
  height: 5px;
  border-radius: 3px;
  background: var(--color-primary-gradient);
}

.landing-mockup-charts {
  display: flex;
  align-items: flex-end;
  gap: 0.9rem;
}

.landing-mockup-donut {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  flex-shrink: 0;
  background: conic-gradient(
    var(--color-primary) 0% 57%,
    #fbbf24 57% 80%,
    #e5e7eb 80% 100%
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 9px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 9px));
}

.landing-mockup-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 0.3rem;
  height: 52px;
}

.landing-mockup-bars span {
  flex: 1;
  background: var(--color-primary-gradient);
  border-radius: 3px 3px 0 0;
  opacity: 0.85;
}

.landing-mockup-float-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text);
  box-shadow: 0 10px 24px -8px rgba(15, 23, 42, 0.18);
  margin-top: -1.1rem;
  position: relative;
  z-index: 2;
}

.landing-mockup-float-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  display: inline-block;
}

/* ---------------- Capabilities strip ---------------- */

.landing-capabilities {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 1.5rem 3rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.landing-capability {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.55rem 1.1rem;
}

.landing-capability-icon {
  font-size: 1rem;
}

/* ---------------- Features ---------------- */

.landing-features {
  max-width: 1120px;
  margin: 0 auto;
  padding: 1rem 1.5rem 5rem;
}

.landing-section-title {
  text-align: center;
  font-size: 1.7rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text);
  margin: 0 0 2.5rem;
}

.landing-feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
}

.landing-feature-card {
  background: var(--color-bg);
  border-radius: var(--radius);
  padding: 1.5rem 1.35rem;
  box-shadow: var(--neu-shadow);
}

.landing-feature-icon {
  display: inline-flex;
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
}

.landing-feature-card h3 {
  margin: 0 0 0.4rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
}

.landing-feature-card p {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

/* ---------------- How it works ---------------- */

.landing-steps {
  max-width: 1120px;
  margin: 0 auto;
  padding: 1rem 1.5rem 5rem;
}

.landing-steps-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.landing-step-card {
  position: relative;
  background: var(--color-bg);
  border-radius: var(--radius);
  padding: 1.75rem 1.5rem;
  box-shadow: var(--neu-shadow);
  text-align: center;
}

.landing-step-number {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.6rem;
}

.landing-step-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--color-primary-bg);
  font-size: 1.5rem;
  margin-bottom: 0.9rem;
}

.landing-step-card h3 {
  margin: 0 0 0.4rem;
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--color-text);
}

.landing-step-card p {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--color-text-secondary);
}

.landing-step-connector {
  display: none;
}

@media (min-width: 761px) {
  .landing-step-connector {
    display: block;
    position: absolute;
    top: 2.6rem;
    right: -0.9rem;
    width: 1.4rem;
    height: 2px;
    background: var(--color-primary);
    opacity: 0.35;
    transform-origin: left;
  }
}

/* ---------------- About ---------------- */

.landing-about {
  background: var(--color-primary-bg);
  padding: 4rem 1.5rem;
}

.landing-about-inner {
  max-width: 720px;
  margin: 0 auto 3rem;
  text-align: center;
}

.landing-about-text {
  margin: 0;
  font-size: 1rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.landing-persona-grid {
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.landing-persona-card {
  background: #ffffff;
  border-radius: var(--radius);
  padding: 1.75rem 1.5rem;
  box-shadow: var(--neu-shadow);
  text-align: center;
}

.landing-persona-icon {
  display: inline-flex;
  font-size: 1.9rem;
  margin-bottom: 0.6rem;
}

.landing-persona-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text);
}

.landing-persona-card p {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--color-text-secondary);
}

/* ---------------- CTA banner ---------------- */

.landing-cta {
  padding: 4.5rem 1.5rem;
  background: var(--sidebar-gradient);
}

.landing-cta-inner {
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.landing-cta-inner h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #ffffff;
}

.landing-btn-light {
  background: #ffffff;
  color: var(--color-primary);
  box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.35);
}

.landing-btn-light:hover {
  box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.4);
}

/* ---------------- Footer ---------------- */

.landing-footer {
  border-top: 1px solid var(--color-border);
  padding: 2.5rem 1.5rem;
}

.landing-footer-inner {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.landing-footer-links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  font-size: 0.88rem;
}

.landing-footer-links a {
  color: var(--color-text-secondary);
  text-decoration: none;
}

.landing-footer-links a:hover {
  color: var(--color-primary);
}

.landing-footer-copy {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  width: 100%;
  text-align: center;
  order: 3;
}

/* ---------------- Responsive ---------------- */

@media (max-width: 900px) {
  .landing-feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .landing-steps-row {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  .landing-step-connector {
    display: none;
  }
  .landing-persona-grid {
    grid-template-columns: 1fr;
  }
  .landing-hero {
    padding: 3.5rem 1.5rem 4rem;
  }
  .landing-hero-title {
    font-size: 2.3rem;
  }
}

@media (max-width: 760px) {
  .landing-nav-links {
    display: none;
  }
  .landing-hero {
    flex-direction: column;
    text-align: center;
    padding: 2.75rem 1.25rem 3rem;
  }
  .landing-hero-text {
    max-width: none;
    margin-left: auto;
    margin-right: auto;
  }
  .landing-hero-actions {
    justify-content: center;
  }
  .landing-hero-visual {
    width: 100%;
  }
  .landing-mockup-frame {
    transform: none;
    max-width: 340px;
  }
  .landing-feature-grid {
    grid-template-columns: 1fr;
  }
  .landing-capabilities {
    gap: 0.6rem;
  }
  .landing-footer-inner {
    flex-direction: column;
    text-align: center;
  }
}


/* ==========================================================================
   App shell: Sidebar + Navbar + content (Phase 10)
   ========================================================================== */
.app-shell {
  display: flex;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin-left: var(--sidebar-width);
}

.app-content {
  flex: 1;
}

/* --- Sidebar --- */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--sidebar-gradient);
  display: flex;
  flex-direction: column;
  padding: 1rem 0.75rem;
  overflow-y: auto;
  z-index: 40;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem 1.25rem;
}

.sidebar-brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: #fff;
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.sidebar-brand-text {
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.sidebar-section-label {
  margin: 1rem 0.6rem 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sidebar-section-label);
}

.sidebar-nav .sidebar-section-label:first-child {
  margin-top: 0;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-radius: var(--radius-sm);
  color: var(--sidebar-text);
  font-size: 0.88rem;
  font-weight: 500;
  text-decoration: none;
  border-left: 2px solid transparent;
}

.sidebar-link:hover {
  background: var(--sidebar-bg-active);
  color: var(--sidebar-text-active);
}

.sidebar-link-active {
  background: var(--sidebar-bg-active);
  color: var(--sidebar-text-active);
  border-left-color: var(--sidebar-accent, #ffffff);
}

.sidebar-backdrop {
  display: none;
}

/* --- Navbar --- */
.navbar {
  height: var(--navbar-height);
  background: var(--color-surface);
  box-shadow: 0 2px 8px rgba(30, 36, 51, 0.06);
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 30;
}

.navbar-menu-btn {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  padding: 0;
}

.navbar-menu-btn span {
  display: block;
  height: 2px;
  background: var(--color-text);
  border-radius: 1px;
}

.navbar-spacer {
  flex: 1;
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.navbar-user-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.navbar-user-role {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

/* --- Notification bell (PHASE 3) --- */
.notif-bell-container {
  position: relative;
}

.notif-bell-btn {
  background: var(--color-bg);
  box-shadow: var(--neu-shadow);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 1rem;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--color-danger);
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  border-radius: 999px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.notif-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 320px;
  max-width: 90vw;
  background: var(--color-surface);
  border-radius: var(--radius);
  box-shadow: var(--neu-shadow-lg);
  overflow: hidden;
  z-index: 40;
}

.notif-dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-bottom: 1px solid var(--color-bg);
}

.notif-list {
  max-height: 320px;
  overflow-y: auto;
}

.notif-item {
  display: block;
  padding: 0.6rem 0.85rem;
  border-bottom: 1px solid var(--color-bg);
  text-decoration: none;
  color: inherit;
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item-unread {
  background: var(--color-primary-bg);
}

.notif-item-message {
  margin: 0 0 0.2rem;
  font-size: 0.82rem;
  color: var(--color-text);
}

.notif-item-time {
  margin: 0;
  font-size: 0.72rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

/* --- Pagination bar --- */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

/* --- Avatars: navbar, table rows, profile page --- */
.navbar-avatar,
.table-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-primary-gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.table-avatar {
  width: 26px;
  height: 26px;
}

.navbar-avatar img,
.table-avatar img,
.profile-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-header-card {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.profile-photo {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-primary-gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 700;
  flex-shrink: 0;
  cursor: pointer;
}

.profile-photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--dur-fast, 0.15s) ease;
}

.profile-photo:hover .profile-photo-overlay {
  opacity: 1;
}

/* PHASE 6: product/category photo thumbnails. Reuses .profile-photo's
   layout (relative positioning, hover overlay) via profile-photo-small,
   but rounded-square instead of circular - a product/category photo
   isn't a person's avatar. */
.profile-photo-small {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-md, 10px);
  font-size: 0.7rem;
}

.profile-photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 4px;
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.product-photo-field {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

/* Small square thumbnail used inside data tables (Products page) */
.table-thumb {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm, 6px);
  overflow: hidden;
  background: var(--color-primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.table-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.table-thumb-placeholder {
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
}

/* PHASE 6: Product Details modal - simple two-column key/value grid */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1.25rem;
  margin-top: 0.75rem;
}

.detail-grid-full {
  grid-column: 1 / -1;
}

.detail-item-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted, #6b7280);
  margin-bottom: 0.15rem;
}

.detail-item-value {
  font-weight: 600;
  word-break: break-word;
}

.detail-photo-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 0.5rem;
}

/* PHASE 8: invoice print support. When printing (Ctrl+P / the invoice's
   "Print / Download" button, which just calls window.print()), hide
   everything on the page except the invoice content itself, so the
   printout is a clean invoice - not the whole app chrome. */
.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

@media print {
  body * {
    visibility: hidden;
  }
  .invoice-print-area,
  .invoice-print-area * {
    visibility: visible;
  }
  .invoice-print-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
  .no-print {
    display: none !important;
  }
}

/* ==========================================================================
   General page layout
   ========================================================================== */
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  gap: 1rem;
}

.page-header h1 {
  margin: 0;
  font-size: 1.4rem;
  letter-spacing: -0.01em;
}

.page-subtitle {
  margin: 0.25rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

/* ==========================================================================
   Buttons
   ========================================================================== */
.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  border: none;
  font-size: 0.88rem;
  font-weight: 600;
}

.btn-primary {
  background: var(--color-primary-gradient);
  color: #fff;
  box-shadow: 0 3px 10px color-mix(in srgb, var(--color-primary) 35%, transparent);
}

.btn-secondary {
  background: var(--color-bg);
  color: var(--color-text);
  box-shadow: var(--neu-shadow);
}

.btn-danger {
  background: linear-gradient(90deg, #e11d48, #f43f5e);
  color: #fff;
  box-shadow: 0 3px 10px rgba(225, 29, 72, 0.3);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.83rem;
  font-weight: 600;
  padding: 0.2rem 0.4rem;
  margin-right: 0.15rem;
}

.btn-link:hover:not(:disabled) {
  text-decoration: underline;
}

.btn-link-danger {
  color: var(--color-danger);
}

/* ==========================================================================
   Banners - persistent, page-level messages (e.g. "failed to load")
   Transient success/error feedback uses the Toast system instead (below).
   ========================================================================== */
.banner {
  padding: 0.6rem 0.9rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
  font-size: 0.88rem;
  background: var(--color-bg);
  box-shadow: var(--neu-shadow-inset);
  border-left: 3px solid transparent;
}

.banner-success {
  color: var(--color-success);
  border-left-color: var(--color-success);
}

.banner-error {
  color: var(--color-danger);
  border-left-color: var(--color-danger);
}

/* PHASE 10: used for non-blocking caveats, e.g. the profit-analytics
   cost-data-limitation note - not an error, just something worth flagging. */
.banner-warning {
  color: var(--color-warning);
  border-left-color: var(--color-warning);
}

/* ==========================================================================
   Toast notifications (Phase 10)
   ========================================================================== */
.toast-stack {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 340px;
}

.toast {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.65rem 0.8rem;
  border-radius: var(--radius-sm);
  font-size: 0.87rem;
  font-weight: 500;
  background: var(--color-surface);
  box-shadow: var(--neu-shadow-lg);
  border-left: 3px solid transparent;
}

.toast-success {
  color: var(--color-success);
  border-left-color: var(--color-success);
}

.toast-error {
  color: var(--color-danger);
  border-left-color: var(--color-danger);
}

.toast-info {
  color: var(--color-primary-hover);
  border-left-color: var(--color-primary);
}

.toast-close {
  background: none;
  border: none;
  font-size: 1rem;
  line-height: 1;
  color: inherit;
  opacity: 0.6;
  padding: 0;
  transition: opacity var(--dur-fast) ease;
}

.toast-close:hover {
  opacity: 1;
}

/* ==========================================================================
   Filters bar
   ========================================================================== */
.filters-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filters-search {
  flex: 1;
  min-width: 200px;
  padding: 0.5rem 0.65rem;
  border: none;
  border-radius: var(--radius-sm);
  font-family: inherit;
  background: var(--color-bg);
  box-shadow: var(--neu-shadow-inset);
  transition: box-shadow var(--dur-fast) ease;
}

.filters-search:focus-visible {
  box-shadow: var(--neu-shadow-inset), 0 0 0 2px var(--color-primary);
}

.filters-bar select {
  padding: 0.5rem 0.65rem;
  border: none;
  border-radius: var(--radius-sm);
  font-family: inherit;
  background: var(--color-bg);
  box-shadow: var(--neu-shadow-inset);
}

/* ==========================================================================
   Data table
   ========================================================================== */
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border-radius: var(--radius);
  box-shadow: var(--neu-shadow);
  overflow: hidden;
}

.data-table th,
.data-table td {
  text-align: left;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--color-bg);
  font-size: 0.88rem;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
}

.data-table th {
  background: transparent;
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
}

/* SKUs get the monospace "ledger" treatment - applied explicitly via
   .cell-mono rather than by column position, since column order differs
   across tables (Products, Categories, Suppliers, Users). */
.cell-mono {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

/* Numbers (quantity, price) read better right-aligned than left-aligned
   text codes like SKU - same monospace treatment, different alignment. */
.cell-numeric {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--color-text);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.data-table th.col-numeric {
  text-align: right;
}

.actions-cell {
  white-space: nowrap;
}

.empty-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 2.5rem 1rem;
  background: var(--color-bg);
  border-radius: var(--radius);
  box-shadow: var(--neu-shadow-inset);
}

.loader {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.loader::before {
  content: '';
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Reusable shimmer skeleton, e.g. for a placeholder while data loads */
.skeleton {
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--color-border) 25%,
    #f4f6f9 37%,
    var(--color-border) 63%
  );
  background-size: 400px 100%;
  animation: shimmer 1.4s infinite linear;
}

/* ==========================================================================
   Badges
   ========================================================================== */
.badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--color-bg);
  box-shadow: var(--neu-shadow-inset);
}

.badge-green {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.badge-yellow {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.badge-red {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

/* PHASE 11: used for "informational/structural" activity-log modules
   (product, category, supplier) that aren't a warning/success/danger -
   just a fourth neutral-ish colored option so a long, mixed-module list
   scans easily without every row looking identical. */
.badge-blue {
  background: var(--color-bg);
  color: var(--color-primary);
  box-shadow: var(--neu-shadow-inset);
}

/* ==========================================================================
   Stock adjust inline control
   ========================================================================== */
.stock-adjust {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.stock-adjust input {
  width: 64px;
  padding: 0.25rem 0.4rem;
  border: none;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  background: var(--color-bg);
  box-shadow: var(--neu-shadow-inset);
}

.stock-adjust button {
  border: none;
  background: var(--color-bg);
  box-shadow: var(--neu-shadow);
  border-radius: 4px;
  width: 24px;
  height: 24px;
  transition: box-shadow var(--dur-fast) ease, transform var(--dur-fast) ease;
}

.stock-adjust button:active {
  box-shadow: var(--neu-shadow-inset);
  transform: scale(0.95);
}

/* ==========================================================================
   Modal
   ========================================================================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 17, 21, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}

.modal-box {
  background: var(--color-surface);
  border-radius: 10px;
  padding: 1.5rem;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--neu-shadow-lg);
}

.modal-box h2 {
  margin: 0 0 1rem;
  font-size: 1.15rem;
}

.modal-form {
  display: flex;
  flex-direction: column;
}

.modal-form label {
  font-size: 0.83rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
}

.modal-form input,
.modal-form select {
  padding: 0.5rem 0.6rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.92rem;
  font-family: inherit;
  background: var(--color-bg);
  box-shadow: var(--neu-shadow-inset);
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.form-row > div {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* PHASE 7: purchase line-item row - product select, qty, price, remove
   button side by side. Direct children (not wrapped in divs like normal
   .form-row usage) so sized explicitly here instead of via the
   ".form-row > div { flex: 1 }" rule above. */
.purchase-item-row {
  align-items: center;
  margin-bottom: 0.5rem;
}

.purchase-item-row select {
  flex: 3;
}

.purchase-item-row input {
  flex: 1;
  min-width: 0;
}

.purchase-item-row button {
  flex: 0 0 auto;
  white-space: nowrap;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

/* ==========================================================================
   Dashboard: stat cards + charts + activity
   ========================================================================== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--neu-shadow);
  /* BUGFIX: a large formatted value (e.g. "₹1,43,15,000.00") was
     overflowing past the card's edge instead of staying inside it -
     \`overflow: hidden\` is a safety net, and the value itself now
     shrinks/wraps gracefully (see .stat-card-value below) so numbers
     stay readable instead of being clipped. */
  overflow: hidden;
  min-width: 0;
}

.stat-card:hover {
  box-shadow: var(--neu-shadow-lg);
}

.stat-card-label {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-card-value {
  margin: 0;
  font-family: var(--font-mono);
  /* BUGFIX: fixed 1.5rem was too big for long currency values in a
     narrow card - clamp() scales it down on smaller cards/screens
     instead of letting the text run past the card's edge. */
  font-size: clamp(1.05rem, 1.1vw + 0.75rem, 1.5rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
  line-height: 1.15;
}

.stat-card-warning .stat-card-value {
  color: var(--color-warning);
}

.stat-card-danger .stat-card-value {
  color: var(--color-danger);
}

.stat-card-success .stat-card-value {
  color: var(--color-success);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}

/* PHASE: dashboard polish - centers a "42 Products" total inside the
   donut chart's hole, positioned over the ResponsiveContainer below it. */
.donut-chart-wrap {
  position: relative;
}

.donut-chart-center {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.donut-chart-center-value {
  font-family: var(--font-mono);
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1;
}

.donut-chart-center-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 0.15rem;
}

.chart-card {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--neu-shadow);
}

.chart-card h3 {
  margin: 0 0 0.75rem;
  font-size: 0.98rem;
}

.chart-card h4 {
  margin: 1rem 0 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.activity-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.activity-list li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-bg);
  font-size: 0.86rem;
}

.activity-list li:last-child {
  border-bottom: none;
}

.activity-time {
  color: var(--color-text-muted);
  white-space: nowrap;
  font-size: 0.78rem;
  font-family: var(--font-mono);
}

/* ==========================================================================
   Stock Alerts
   ========================================================================== */
.alert-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  box-shadow: var(--neu-shadow);
}

.alert-message {
  margin: 0.4rem 0 0.2rem;
  font-size: 0.88rem;
}

.alert-meta {
  margin: 0;
  font-size: 0.76rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

/* --- Nav badge (active alert count), used in the Sidebar --- */
.nav-badge {
  display: inline-block;
  margin-left: auto;
  background: var(--color-danger);
  color: #fff;
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  font-size: 0.68rem;
  font-weight: 700;
}

/* ==========================================================================
   Admin: User Management
   ========================================================================== */
.you-tag {
  color: var(--color-text-muted);
  font-size: 0.76rem;
  font-weight: 400;
}

/* ==========================================================================
   Responsive: collapse sidebar to a slide-over drawer below 900px
   ========================================================================== */
@media (max-width: 900px) {
  .app-main {
    margin-left: 0;
  }

  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
  }

  .sidebar-open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 17, 21, 0.4);
    z-index: 35;
  }

  .navbar-menu-btn {
    display: flex;
  }

  .navbar-user-name {
    display: none;
  }
}

/* ==========================================================================
   PHASE 12: Mobile UI/UX
   Everything below fixes real usability breaks on narrow screens across
   EVERY page that uses these shared classes (Products, Categories,
   Suppliers, Purchases, Sales, Customers, Users, Reports, Analytics,
   Activity Logs, all detail/form modals) - not just the Dashboard.
   ========================================================================== */
@media (max-width: 768px) {
  /* Tables (Products/Purchases/Sales/etc. routinely have 6-9 columns) were
     overflowing the viewport with no way to see the hidden columns. Making
     the <table> itself a horizontally-scrollable block is the standard
     no-JS fix - the table's internal row/cell layout is unaffected,
     scrolling reveals the rest. */
  .data-table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    white-space: nowrap;
  }

  /* Multiple action buttons (View/Edit/Delete) in the last column would
     otherwise wrap onto several lines inside an already-scrolling row -
     keep them on one line, consistent with the rest of the scrollable row. */
  .actions-cell {
    white-space: nowrap;
  }
}

@media (max-width: 600px) {
  /* Two-or-more-field rows (Add/Edit forms, the Purchase/Sale line-item
     row, discount/tax/payment fields) were squeezing every field down to
     an unreadable sliver on a narrow screen instead of stacking. */
  .form-row {
    flex-direction: column;
  }

  .form-row > div {
    width: 100%;
  }

  /* The Purchase form's per-line-item row (product select + qty + price +
     remove button) used flex-basis ratios that assumed desktop width -
     stack them too, same reasoning as .form-row above. */
  .purchase-item-row {
    flex-direction: column;
    align-items: stretch;
  }

  .purchase-item-row select,
  .purchase-item-row input {
    width: 100%;
  }

  /* Page-header action groups (e.g. "Export CSV" + "Import CSV" +
     "+ Add Product") were a single unwrapped flex row that could run past
     a narrow screen's edge instead of wrapping to a second line. */
  .page-header > div {
    flex-wrap: wrap;
  }

  /* Product/Purchase/Sale details modals' two-column key/value grid reads
     cramped at this width - one column keeps every value fully readable. */
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .toast-stack {
    left: 1rem;
    right: 1rem;
    max-width: none;
  }
}

`;

function AppStyles() {
  return <style>{CSS}</style>;
}

export default AppStyles;
