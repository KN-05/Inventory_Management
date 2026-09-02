// scripts/seed.js
// Run with: npm run seed  (from the /server folder)
//
// Populates the database with:
//   - One demo Admin account
//   - One demo Staff/Manager account
//   - A couple of sample Categories and Suppliers
//   - A couple of sample Products (one In Stock, one Low Stock, so the
//     Dashboard and Stock Alerts pages have something to show immediately)
//
// Safe to re-run: uses upsert-style logic so it won't create duplicates
// if you run it more than once.

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

const DEMO_ADMIN = {
  name: 'Demo Admin',
  email: 'admin@example.com',
  password: 'Admin@123',
  role: 'admin',
};

const DEMO_STAFF = {
  name: 'Demo Staff',
  email: 'staff@example.com',
  password: 'Staff@123',
  role: 'staff',
};

async function seed() {
  await connectDB();

  console.log('\nSeeding demo data...\n');

  // --- Users ---
  for (const demoUser of [DEMO_ADMIN, DEMO_STAFF]) {
    const existing = await User.findOne({ email: demoUser.email });
    if (existing) {
      console.log(`User already exists, skipping: ${demoUser.email}`);
    } else {
      // Passing the plain password here is correct - the User model's
      // pre('save') hook hashes it automatically.
      await User.create(demoUser);
      console.log(`Created user: ${demoUser.email} (${demoUser.role})`);
    }
  }

  // --- Categories ---
  const categoriesData = [
    { name: 'Electronics', description: 'Electronic devices and accessories' },
    { name: 'Office Supplies', description: 'Stationery and office equipment' },
  ];
  const categories = {};
  for (const c of categoriesData) {
    const doc = await Category.findOneAndUpdate({ name: c.name }, c, {
      upsert: true,
      new: true,
    });
    categories[c.name] = doc;
  }
  console.log(`Categories ready: ${categoriesData.map((c) => c.name).join(', ')}`);

  // --- Suppliers ---
  const suppliersData = [
    { name: 'Acme Supplies Co.', email: 'contact@acmesupplies.com', phone: '555-0100' },
    { name: 'Global Traders Ltd.', email: 'sales@globaltraders.com', phone: '555-0200' },
  ];
  const suppliers = {};
  for (const s of suppliersData) {
    const doc = await Supplier.findOneAndUpdate({ name: s.name }, s, {
      upsert: true,
      new: true,
    });
    suppliers[s.name] = doc;
  }
  console.log(`Suppliers ready: ${suppliersData.map((s) => s.name).join(', ')}`);

  // --- Products ---
  const productsData = [
    {
      name: 'Wireless Mouse',
      sku: 'ELEC-001',
      category: categories['Electronics']._id,
      supplier: suppliers['Acme Supplies Co.']._id,
      quantity: 50,
      price: 19.99,
      lowStockThreshold: 10,
    },
    {
      name: 'USB-C Cable',
      sku: 'ELEC-002',
      category: categories['Electronics']._id,
      supplier: suppliers['Global Traders Ltd.']._id,
      quantity: 5, // intentionally below threshold, so a Stock Alert is created
      price: 9.99,
      lowStockThreshold: 10,
    },
    {
      name: 'A4 Notebook',
      sku: 'OFF-001',
      category: categories['Office Supplies']._id,
      supplier: suppliers['Acme Supplies Co.']._id,
      quantity: 200,
      price: 3.5,
      lowStockThreshold: 25,
    },
  ];

  for (const p of productsData) {
    const existing = await Product.findOne({ sku: p.sku });
    if (existing) {
      console.log(`Product already exists, skipping: ${p.sku}`);
    } else {
      // Using .create() (not insertMany) so the model's pre/post save
      // hooks run - this auto-calculates `status` and creates a Stock
      // Alert for the low-stock item, exactly like the real app would.
      await Product.create(p);
      console.log(`Created product: ${p.name} (${p.sku})`);
    }
  }

  console.log('\nSeed complete. Demo credentials:');
  console.log(`  Admin -> email: ${DEMO_ADMIN.email}  password: ${DEMO_ADMIN.password}`);
  console.log(`  Staff -> email: ${DEMO_STAFF.email}  password: ${DEMO_STAFF.password}`);
  console.log('\nIMPORTANT: change or remove these demo accounts before deploying to production.\n');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
