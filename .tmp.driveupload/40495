// utils/generateProductCodes.js
// PHASE 6: shared helper for auto-generating a unique SKU + barcode for a
// new product. Used by both productController.js's createProduct (normal
// "Add Product" form) and importProducts (CSV bulk import, when a row
// doesn't already specify a SKU), so the two flows can never drift apart.
//
// Collisions are vanishingly unlikely (SKU includes a sequence number,
// barcode includes a millisecond timestamp), but we still verify
// uniqueness against the database in a small retry loop rather than
// trusting that alone - correctness over cleverness.

const Product = require('../models/Product');

async function generateUniqueSku(categoryName, productName) {
  // Start from "how many products already exist" as a reasonable next
  // sequence number, then bump it if that candidate happens to collide.
  let sequence = (await Product.countDocuments()) + 1;

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = Product.buildSkuCandidate(categoryName, productName, sequence + attempt);
    // eslint-disable-next-line no-await-in-loop
    const existing = await Product.findOne({ sku: candidate });
    if (!existing) return candidate;
  }

  // Extremely unlikely fallback: fold in the current timestamp so it's
  // guaranteed to be different from anything already in the database.
  return `${Product.buildSkuCandidate(categoryName, productName, sequence)}-${Date.now()}`;
}

async function generateUniqueBarcode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = Product.buildBarcodeCandidate();
    // eslint-disable-next-line no-await-in-loop
    const existing = await Product.findOne({ barcode: candidate });
    if (!existing) return candidate;
  }

  return `${Product.buildBarcodeCandidate()}${Math.floor(Math.random() * 1000)}`;
}

module.exports = { generateUniqueSku, generateUniqueBarcode };
