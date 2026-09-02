// src/utils/formatCurrency.js
// One shared formatter for money values across the whole app - so every
// price, stock value, and report total displays consistently as Indian
// Rupees (₹12,500.50) instead of each component doing its own `$${x}`.

export function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
