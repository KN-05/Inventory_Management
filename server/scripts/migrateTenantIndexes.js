// scripts/migrateTenantIndexes.js
// Run once against the existing database when upgrading to multi-business
// tenant indexes:
//   node scripts/migrateTenantIndexes.js
//
// Older versions created GLOBAL unique indexes (for example categories.name_1).
// Those indexes prevent two separate businesses from using the same value even
// though the current schemas use compound { business, field } indexes.
//
// This script removes ONLY legacy unique indexes that contain exactly one key
// from the explicit allow-list below. It does not touch documents, non-unique
// indexes, compound indexes, or user/email indexes. Safe to run repeatedly.

require('dotenv').config();
const mongoose = require('mongoose');

const LEGACY_GLOBAL_UNIQUE_FIELDS = {
  products: new Set(['sku', 'barcode']),
  sales: new Set(['invoiceNumber']),
  purchases: new Set(['purchaseNumber']),
  categories: new Set(['name']),
};

async function migrate() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing. Set it in server/.env before running this migration.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  for (const [collectionName, allowedFields] of Object.entries(LEGACY_GLOBAL_UNIQUE_FIELDS)) {
    const collection = db.collection(collectionName);
    let indexes;

    try {
      indexes = await collection.listIndexes().toArray();
    } catch (err) {
      if (err.code === 26 || /ns not found|namespace not found/i.test(err.message)) {
        console.log(`skipped ${collectionName} (collection does not exist yet)`);
        continue;
      }
      throw err;
    }

    for (const index of indexes) {
      const keys = Object.keys(index.key || {});
      const isLegacyGlobalUnique = index.unique === true
        && keys.length === 1
        && allowedFields.has(keys[0]);

      if (!isLegacyGlobalUnique) continue;

      await collection.dropIndex(index.name);
      console.log(`dropped legacy global unique index ${collectionName}.${index.name}`);
    }
  }

  console.log('Migration complete. No documents were changed or deleted.');
  console.log('Restart the API so Mongoose can create the current per-business compound indexes.');
}

migrate()
  .catch((err) => {
    console.error('Tenant index migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
