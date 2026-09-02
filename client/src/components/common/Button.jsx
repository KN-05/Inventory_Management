// src/components/common/Button.jsx
// Reusable animated button - hover-lift and press-scale are done with
// Framer Motion (whileHover/whileTap) instead of CSS :hover/:active
// transitions, so the whole app's button feedback goes through one place.
//
// Usage: <Button variant="primary" onClick={...}>Save</Button>
// `variant` maps to the existing btn-primary/btn-secondary/btn-danger/
// btn-link CSS classes, so all the colour/shadow styling is unchanged -
// only the hover/press motion moved into this component.

import { motion } from 'framer-motion';

const liftVariants = {
  primary: { whileHover: { y: -1 }, whileTap: { scale: 0.97 } },
  danger: { whileHover: { y: -1 }, whileTap: { scale: 0.97 } },
  secondary: { whileHover: { y: -1 }, whileTap: { scale: 0.98 } },
  link: { whileTap: { scale: 0.96 } },
};

function Button({ variant = 'primary', className = '', children, ...rest }) {
  const motionProps = liftVariants[variant] || {};
  const classNames = `btn-${variant} ${className}`.trim();

  return (
    <motion.button
      className={classNames}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      {...motionProps}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export default Button;
