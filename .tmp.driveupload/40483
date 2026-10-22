// utils/generateInvoiceNumber.js
// PHASE 8: same pattern as utils/generatePurchaseNumber.js - guess a
// reasonable next sequence number, then verify uniqueness against the
// database with a small retry loop.

const Sale = require('../models/Sale');

async function generateUniqueInvoiceNumber() {
  let sequence = (await Sale.countDocuments()) + 1;

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = Sale.buildInvoiceNumberCandidate(sequence + attempt);
    // eslint-disable-next-line no-await-in-loop
    const existing = await Sale.findOne({ invoiceNumber: candidate });
    if (!existing) return candidate;
  }

  return `${Sale.buildInvoiceNumberCandidate(sequence)}-${Date.now()}`;
}

module.exports = { generateUniqueInvoiceNumber };
