// tests/dashboard.test.js - the dashboard summary after its 7 product queries
// were merged into one $facet aggregation. Models are stubbed, so this checks
// the arithmetic and the response shape, NOT MongoDB itself - also compare the
// real dashboard numbers before/after on your own data.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const stub = (rel, exports) => {
  const file = require.resolve(path.join(__dirname, '..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
const facet = (byStatus, stockValue, byCategory) => [{ byStatus, stockValue, byCategory }];
let aggregateResult;

stub('models/Product.js', { aggregate: async () => aggregateResult });
stub('models/Supplier.js', { countDocuments: async () => 4 });
stub('models/Category.js', { countDocuments: async () => 4 });
const chain = { sort() { return this; }, limit() { return this; }, populate: async () => [] };
stub('models/ActivityLog.js', { find: () => chain });
stub('models/StockAlert.js', { countDocuments: async () => 2 });

const { getDashboardSummary } = require('../controllers/dashboardController');
const run = (role) =>
  new Promise((resolve, reject) => {
    const res = { status() { return this; }, json: (body) => resolve(body.summary) };
    getDashboardSummary({ user: { role } }, res, reject);
  });

test('summary numbers come out of the single facet result', async () => {
  aggregateResult = facet(
    [{ _id: 'In Stock', count: 6 }, { _id: 'Low Stock', count: 4 }],
    [{ _id: null, totalValue: 33130002 }],
    [{ category: 'Mobile & Accessories', count: 5 }, { category: 'Electronics', count: 1 }]
  );
  const s = await run('admin');
  assert.equal(s.totalProducts, 10);
  assert.deepEqual(s.stockStatusBreakdown, { inStock: 6, lowStock: 4, outOfStock: 0 });
  assert.equal(s.totalStockValue, 33130002);
  assert.equal(s.categoryBreakdown.length, 2);
  assert.equal(s.totalSuppliers, 4);
  assert.equal(s.activeAlertsCount, 2);
});

test('staff still never receives the stock value', async () => {
  aggregateResult = facet([{ _id: 'In Stock', count: 1 }], [{ _id: null, totalValue: 500 }], []);
  const s = await run('staff');
  assert.equal(s.totalStockValue, undefined);
});

test('an empty database gives zeros, not errors', async () => {
  aggregateResult = facet([], [], []);
  const s = await run('admin');
  assert.equal(s.totalProducts, 0);
  assert.deepEqual(s.stockStatusBreakdown, { inStock: 0, lowStock: 0, outOfStock: 0 });
  assert.equal(s.totalStockValue, 0);
});
