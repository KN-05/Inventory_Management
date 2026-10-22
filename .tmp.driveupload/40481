// utils/generatePurchaseNumber.js
// PHASE 7: same pattern as utils/generateProductCodes.js's SKU generator -
// start from a reasonable next sequence number, then verify uniqueness
// against the database with a small retry loop rather than trusting a
// single guess.

const Purchase = require('../models/Purchase');

async function generateUniquePurchaseNumber() {
  let sequence = (await Purchase.countDocuments()) + 1;

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = Purchase.buildPurchaseNumberCandidate(sequence + attempt);
    // eslint-disable-next-line no-await-in-loop
    const existing = await Purchase.findOne({ purchaseNumber: candidate });
    if (!existing) return candidate;
  }

  return `${Purchase.buildPurchaseNumberCandidate(sequence)}-${Date.now()}`;
}

module.exports = { generateUniquePurchaseNumber };
