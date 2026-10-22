// scripts/reportLimitViolations.js
// READ-ONLY report of existing products that break the new limits
// (price 0.01..1,00,00,000 with max 2 decimals, quantity integer 0..1000).
// It only runs find() - it never edits, clamps or deletes anything.
//
// Run from the server folder:   node scripts/reportLimitViolations.js

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { parsePrice, parseQuantity } = require('../utils/productLimits');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const products = await Product.find().select('name sku quantity price').lean();
  const problems = [];

  for (const p of products) {
    const price = parsePrice(p.price);
    const quantity = parseQuantity(p.quantity);
    if (!price.ok) problems.push({ sku: p.sku, name: p.name, field: 'price', value: p.price, problem: price.message });
    if (!quantity.ok) problems.push({ sku: p.sku, name: p.name, field: 'quantity', value: p.quantity, problem: quantity.message });
  }

  console.log(`Checked ${products.length} product(s).`);
  if (problems.length === 0) {
    console.log('No existing product breaks the limits.');
  } else {
    console.log(`${problems.length} problem(s) found (NOT modified - fix them manually from the Edit Product form):`);
    console.table(problems);
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error('Report failed:', err.message);
  process.exit(1);
});
