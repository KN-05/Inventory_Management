// src/components/dashboard/StatCard.jsx
// A single metric tile, e.g. "Total Products: 42".
// Animation (Phase 1 revision): entrance fade/slide and hover-lift are
// done with Framer Motion instead of CSS @keyframes/transitions - the
// `index` prop staggers each card's entrance by a small delay.

import { motion } from 'framer-motion';

function StatCard({ label, value, tone = 'default', index = 0 }) {
  return (
    <motion.div
      className={`stat-card stat-card-${tone}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
      whileHover={{ y: -2 }}
    >
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
    </motion.div>
  );
}

export default StatCard;
