// src/components/auth/LoginIllustration.jsx
// PHASE 14 (redesign v2): an ORIGINAL, static SVG illustration for the
// login page's right panel - a warehouse shelf with product boxes, a
// checked-off inventory checklist, and a small sales/revenue bar chart,
// covering the "products / stock / checklist / sales / reports"
// concepts this app is actually about.
//
// Per the latest design direction this is intentionally CALM: one
// single fade-in on mount, no floating loops, no pulsing, no
// scan-line sweep - a professional static graphic, not an animated
// scene. Everything here is plain SVG + Framer Motion for the single
// entrance transition only - no image files, no illustration library.

import { motion } from 'framer-motion';

function LoginIllustration() {
  return (
    <motion.svg
      viewBox="0 0 320 280"
      width="82%"
      style={{ maxWidth: 320 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Warehouse shelf */}
      <rect x="20" y="196" width="280" height="14" rx="4" fill="rgba(255,255,255,0.35)" />
      <rect x="20" y="236" width="280" height="14" rx="4" fill="rgba(255,255,255,0.25)" />
      <rect x="30" y="210" width="10" height="26" fill="rgba(255,255,255,0.25)" />
      <rect x="280" y="210" width="10" height="26" fill="rgba(255,255,255,0.25)" />

      {/* Product boxes on the shelf */}
      <rect x="46" y="146" width="58" height="50" rx="6" fill="#fde68a" />
      <rect x="46" y="146" width="58" height="14" rx="6" fill="#fbbf24" />
      <line x1="75" y1="146" x2="75" y2="196" stroke="#b45309" strokeWidth="2" />

      <rect x="118" y="126" width="64" height="70" rx="6" fill="#ffffff" fillOpacity="0.94" />
      <rect x="118" y="126" width="64" height="16" rx="6" fill="#e2e8f0" />
      <line x1="150" y1="126" x2="150" y2="196" stroke="#94a3b8" strokeWidth="2" />
      <rect x="129" y="155" width="3" height="24" fill="#64748b" />
      <rect x="136" y="155" width="2" height="24" fill="#64748b" />
      <rect x="142" y="155" width="4" height="24" fill="#64748b" />
      <rect x="150" y="155" width="2" height="24" fill="#64748b" />
      <rect x="156" y="155" width="3" height="24" fill="#64748b" />
      <rect x="163" y="155" width="4" height="24" fill="#64748b" />

      <rect x="196" y="151" width="56" height="45" rx="6" fill="#c4b5fd" />
      <rect x="196" y="151" width="56" height="13" rx="6" fill="#a78bfa" />
      <line x1="224" y1="151" x2="224" y2="196" stroke="#6d28d9" strokeWidth="2" />

      {/* Inventory checklist card, top-left */}
      <g transform="translate(14, 26)">
        <rect x="0" y="10" width="68" height="84" rx="8" fill="#ffffff" fillOpacity="0.95" />
        <rect x="17" y="0" width="34" height="14" rx="4" fill="#e9d5ff" />
        <rect x="11" y="30" width="46" height="6" rx="3" fill="#cbd5e1" />
        <rect x="11" y="44" width="46" height="6" rx="3" fill="#cbd5e1" />
        <rect x="11" y="58" width="30" height="6" rx="3" fill="#cbd5e1" />
        <circle cx="34" cy="79" r="15" fill="#22c55e" />
        <path
          d="M27 79 L32 85 L43 72"
          fill="none"
          stroke="#fff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Sales/revenue mini bar-chart card, top-right - covers the
          "sales/revenue" and "reports" part of the brief */}
      <g transform="translate(226, 26)">
        <rect x="0" y="0" width="80" height="70" rx="8" fill="#ffffff" fillOpacity="0.95" />
        <rect x="12" y="42" width="10" height="16" rx="2" fill="#c4b5fd" />
        <rect x="27" y="30" width="10" height="28" rx="2" fill="#a78bfa" />
        <rect x="42" y="18" width="10" height="40" rx="2" fill="#7c3aed" />
        <rect x="57" y="26" width="10" height="32" rx="2" fill="#a78bfa" />
      </g>
    </motion.svg>
  );
}

export default LoginIllustration;
