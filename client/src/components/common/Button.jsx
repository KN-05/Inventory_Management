// src/components/common/Button.jsx
// Reusable button. `variant` maps to the btn-primary / btn-secondary /
// btn-danger / btn-link CSS classes. Hover and pressed feedback are plain
// CSS colour changes now (no lift/scale animation) - a business tool
// shouldn't have buttons that bounce.
//
// Usage: <Button variant="primary" onClick={...}>Save</Button>

function Button({ variant = 'primary', className = '', children, ...rest }) {
  const classNames = `btn-${variant} ${className}`.trim();

  return (
    <button className={classNames} {...rest}>
      {children}
    </button>
  );
}

export default Button;
