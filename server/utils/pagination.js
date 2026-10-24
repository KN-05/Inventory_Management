// utils/pagination.js
// Keeps ?limit= inside a sane range. Before, `?limit=1000000` made the API
// load an entire collection into memory in one request.
//
// MAX_PAGE_SIZE is 1000 (not 100) on purpose: the Sales screen loads its
// product and customer pickers with limit=1000. Normal list pages use the
// default of 20.

const MAX_PAGE_SIZE = 1000;

function clampLimit(rawLimit, defaultLimit = 20) {
  const parsed = parseInt(rawLimit, 10);
  const wanted = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultLimit;
  return Math.min(wanted, MAX_PAGE_SIZE);
}

module.exports = { clampLimit, MAX_PAGE_SIZE };
