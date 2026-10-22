// utils/productLimits.js
// Single source of truth for the product price / quantity limits on the SERVER.
// The client has a matching copy in client/src/utils/productLimits.js - keep the
// two identical.
//
// Nothing here ever clamps, rounds or "fixes" a value: every function either
// returns the exact parsed value or an error message. Callers must reject the
// request when `ok` is false.

const MAX_PRICE = 10000000; // Rs 1,00,00,000 (1 crore)
const MIN_PRICE = 0.01;
const MAX_QUANTITY = 1000;

const MAX_PRICE_MESSAGE = 'Maximum product price allowed is ₹1,00,00,000.';
const INVALID_PRICE_MESSAGE = 'Price must be a valid positive number with up to 2 decimal places.';
const QUANTITY_MESSAGE = 'Quantity must be an integer between 0 and 1000.';
const AMOUNT_MESSAGE = 'Amount must be a whole number between 1 and 1000.';

const ok = (value) => ({ ok: true, value });
const fail = (message) => ({ ok: false, message });

// Accepts a JS number or a plain numeric string ("85000", "99999.99").
// Rejects: empty, null/undefined, booleans, arrays/objects, NaN, Infinity,
// zero, negatives, "1e7", "0x10", "1,00,000", more than 2 decimals.
function parsePrice(raw) {
  let value;

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return fail(INVALID_PRICE_MESSAGE);
    if (Number(raw.toFixed(2)) !== raw) return fail(INVALID_PRICE_MESSAGE); // > 2 decimals
    value = raw;
  } else if (typeof raw === 'string') {
    const text = raw.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return fail(INVALID_PRICE_MESSAGE);
    value = Number(text); // may become Infinity for absurdly long digit strings -> caught below
  } else {
    return fail(INVALID_PRICE_MESSAGE);
  }

  if (Number.isNaN(value) || value < MIN_PRICE) return fail(INVALID_PRICE_MESSAGE);
  if (value > MAX_PRICE) return fail(MAX_PRICE_MESSAGE); // also catches Infinity
  return ok(value);
}

function parseIntegerInRange(raw, min, max, message) {
  let value;

  if (typeof raw === 'number') {
    if (!Number.isInteger(raw)) return fail(message); // rejects NaN, Infinity, 10.5
    value = raw;
  } else if (typeof raw === 'string') {
    const text = raw.trim();
    if (!/^\d+$/.test(text)) return fail(message); // rejects '', '-1', '10.5', '1e3'
    value = Number(text);
    if (!Number.isSafeInteger(value)) return fail(message);
  } else {
    return fail(message);
  }

  if (value < min || value > max) return fail(message);
  return ok(value);
}

// Stock level of a product: integer 0..1000.
const parseQuantity = (raw) => parseIntegerInRange(raw, 0, MAX_QUANTITY, QUANTITY_MESSAGE);

// Amount added/removed by a stock adjustment: integer 1..1000.
const parseStockAmount = (raw) => parseIntegerInRange(raw, 1, MAX_QUANTITY, AMOUNT_MESSAGE);

// The limit applies to the FINAL stock, not just to the amount being added.
function increaseExceedsLimitMessage(currentStock, amount) {
  return (
    `${QUANTITY_MESSAGE} Current stock is ${currentStock}; adding ${amount} would make it ` +
    `${currentStock + amount}.`
  );
}

// Adapter so the same parsers can be used inside express-validator chains:
//   body('price').custom(validatorFrom(parsePrice))
const validatorFrom = (parser) => (value) => {
  const result = parser(value);
  if (!result.ok) throw new Error(result.message);
  return true;
};

module.exports = {
  MAX_PRICE,
  MIN_PRICE,
  MAX_QUANTITY,
  MAX_PRICE_MESSAGE,
  INVALID_PRICE_MESSAGE,
  QUANTITY_MESSAGE,
  AMOUNT_MESSAGE,
  parsePrice,
  parseQuantity,
  parseStockAmount,
  increaseExceedsLimitMessage,
  validatorFrom,
};
