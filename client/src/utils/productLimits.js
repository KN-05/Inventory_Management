// src/utils/productLimits.js
// Client-side copy of server/utils/productLimits.js - keep the two identical.
// The server is always the final authority; this only gives instant feedback.

export const MAX_PRICE = 10000000; // ₹1,00,00,000 (1 crore)
export const MIN_PRICE = 0.01;
export const MAX_QUANTITY = 1000;

export const MAX_PRICE_MESSAGE = 'Maximum product price allowed is ₹1,00,00,000.';
export const INVALID_PRICE_MESSAGE = 'Price must be a valid positive number with up to 2 decimal places.';
export const QUANTITY_MESSAGE = 'Quantity must be an integer between 0 and 1000.';
export const AMOUNT_MESSAGE = 'Amount must be a whole number between 1 and 1000.';

const ok = (value) => ({ ok: true, value });
const fail = (message) => ({ ok: false, message });

export function parsePrice(raw) {
  let value;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return fail(INVALID_PRICE_MESSAGE);
    if (Number(raw.toFixed(2)) !== raw) return fail(INVALID_PRICE_MESSAGE);
    value = raw;
  } else if (typeof raw === 'string') {
    const text = raw.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return fail(INVALID_PRICE_MESSAGE);
    value = Number(text);
  } else {
    return fail(INVALID_PRICE_MESSAGE);
  }
  if (Number.isNaN(value) || value < MIN_PRICE) return fail(INVALID_PRICE_MESSAGE);
  if (value > MAX_PRICE) return fail(MAX_PRICE_MESSAGE);
  return ok(value);
}

function parseIntegerInRange(raw, min, max, message) {
  let value;
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw)) return fail(message);
    value = raw;
  } else if (typeof raw === 'string') {
    const text = raw.trim();
    if (!/^\d+$/.test(text)) return fail(message);
    value = Number(text);
    if (!Number.isSafeInteger(value)) return fail(message);
  } else {
    return fail(message);
  }
  if (value < min || value > max) return fail(message);
  return ok(value);
}

export const parseQuantity = (raw) => parseIntegerInRange(raw, 0, MAX_QUANTITY, QUANTITY_MESSAGE);
export const parseStockAmount = (raw) => parseIntegerInRange(raw, 1, MAX_QUANTITY, AMOUNT_MESSAGE);

// Used by the inline "Adjust Stock" control: checks the FINAL stock, not just the amount.
export function checkStockChange(currentStock, direction, rawAmount) {
  const amount = parseStockAmount(rawAmount);
  if (!amount.ok) return amount;
  if (direction === 'increase') {
    if (currentStock + amount.value > MAX_QUANTITY) {
      return fail(
        `${QUANTITY_MESSAGE} Current stock is ${currentStock}; adding ${amount.value} would make it ${currentStock + amount.value}.`
      );
    }
  } else if (amount.value > currentStock) {
    return fail(`Cannot decrease stock below 0. Current stock is ${currentStock}.`);
  }
  return amount;
}
