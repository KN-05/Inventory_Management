// tests/productLimits.test.js
// Run from the server folder:   node --test tests/
//
// No database needed: the Mongoose models are replaced with a tiny in-memory
// fake that applies the same conditional-update rule MongoDB does
// (filter on quantity + $inc), and the real Express router, express-validator
// rules, controllers and CSV import code are exercised over real HTTP.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const resolve = (rel) => require.resolve(path.join(__dirname, '..', rel));
const stub = (rel, exports) => {
  const file = resolve(rel);
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};

// ---------- in-memory fake models ----------
const store = new Map(); // id -> product
let nextId = 1;

function makeDoc(data) {
  const doc = {
    ...data,
    calculateStatus() {
      if (this.quantity <= 0) return 'Out of Stock';
      if (this.quantity <= this.lowStockThreshold) return 'Low Stock';
      return 'In Stock';
    },
    async save() {
      store.set(String(this._id), this);
      return this;
    },
  };
  return doc;
}

const FakeProduct = {
  async create(data) {
    const doc = makeDoc({ _id: `p${nextId++}`, lowStockThreshold: 10, status: 'In Stock', ...data });
    store.set(doc._id, doc);
    return doc;
  },
  async findOneAndUpdate(filter, update) {
    const doc = store.get(String(filter._id));
    if (!doc) return null;
    const q = filter.quantity || {};
    if (q.$lte !== undefined && !(doc.quantity <= q.$lte)) return null;
    if (q.$gte !== undefined && !(doc.quantity >= q.$gte)) return null;
    doc.quantity += update.$inc.quantity; // synchronous => atomic, like a single MongoDB op
    return doc;
  },
  findById(id) {
    const doc = store.get(String(id)) || null;
    const p = Promise.resolve(doc);
    p.select = () => p;
    return p;
  },
  async findOne() { return null; },
  async countDocuments() { return store.size; },
  buildSkuCandidate: () => 'SKU',
};

const categories = [{ _id: 'c1', name: 'Electronics' }];
const suppliers = [{ _id: 's1', name: 'Acme' }];
stub('models/Product.js', FakeProduct);
stub('models/Category.js', { find: async () => categories, findById: async () => categories[0] });
stub('models/Supplier.js', { find: async () => suppliers });
stub('models/StockAlert.js', {});
stub('models/StockMovement.js', { create: async () => ({}) });
stub('utils/logActivity.js', async () => {});
stub('utils/generateProductCodes.js', {
  generateUniqueSku: async () => `SKU-${nextId}`,
  generateUniqueBarcode: async () => `BC${nextId}`,
});
stub('middleware/authMiddleware.js', { protect: (req, res, next) => { req.user = { _id: 'u1', role: 'admin' }; next(); } });
stub('middleware/roleMiddleware.js', {
  authorize: () => (req, res, next) => next(),
  requirePermission: () => (req, res, next) => next(),
});

const limits = require('../utils/productLimits');
const { errorHandler } = require('../middleware/errorMiddleware');
const router = require('../routes/productRoutes');

let server;
let base;
test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', router);
  app.use(errorHandler);
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}/api/products`;
});
test.after(() => server.close());

const json = (method, url, body) =>
  fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: await r.json() }));

const valid = { name: 'Phone', category: 'c1', supplier: 's1', quantity: 5, price: 85000 };
const reset = () => store.clear();

// ---------- parsers ----------
test('price parser follows the spec table', () => {
  const ok = [85000, '85000', 9999999.99, 10000000, '10000000', '10000000.00', 0.01];
  const bad = [10000000.01, '10000000.01', 1e12, '1000000000000', 0, -1, '-5', '', null, undefined, NaN, Infinity, 'abc', '1e7', '1,00,000', 12.345, true, [], {}];
  ok.forEach((v) => assert.equal(limits.parsePrice(v).ok, true, `should accept ${String(v)}`));
  bad.forEach((v) => assert.equal(limits.parsePrice(v).ok, false, `should reject ${String(v)}`));
  assert.equal(limits.parsePrice(10000000.01).message, 'Maximum product price allowed is ₹1,00,00,000.');
  assert.equal(limits.parsePrice(1e12).message, 'Maximum product price allowed is ₹1,00,00,000.');
});

test('quantity parser follows the spec table', () => {
  [0, 1, 1000, '1000', '7'].forEach((v) => assert.equal(limits.parseQuantity(v).ok, true, `accept ${v}`));
  [1001, -1, 10.5, '10.5', '', null, undefined, NaN, Infinity, '1e3', false].forEach((v) =>
    assert.equal(limits.parseQuantity(v).ok, false, `reject ${String(v)}`)
  );
  assert.equal(limits.parseQuantity(1001).message, 'Quantity must be an integer between 0 and 1000.');
});

// ---------- create / update over HTTP ----------
test('POST /products: accepted prices and quantities', async () => {
  for (const [price, quantity] of [[85000, 5], [9999999.99, 1000], [10000000, 0]]) {
    const r = await json('POST', '/', { ...valid, price, quantity });
    assert.equal(r.status, 201, `price ${price} qty ${quantity}`);
  }
});

test('POST /products: rejected prices (direct API request, frontend bypassed)', async () => {
  for (const price of [10000000.01, 1e12, 0, -5, 'abc', null, 12.345]) {
    const r = await json('POST', '/', { ...valid, price });
    assert.equal(r.status, 400, `price ${price}`);
  }
  const r = await json('POST', '/', { ...valid, price: 10000000.01 });
  assert.match(JSON.stringify(r.body), /Maximum product price allowed is ₹1,00,00,000\./);
});

test('POST /products: rejected quantities', async () => {
  for (const quantity of [1001, -1, 10.5, '', null, 'x']) {
    const r = await json('POST', '/', { ...valid, quantity });
    assert.equal(r.status, 400, `quantity ${quantity}`);
  }
  const r = await json('POST', '/', { ...valid, quantity: 1001 });
  assert.match(JSON.stringify(r.body), /Quantity must be an integer between 0 and 1000\./);
});

test('PUT /products/:id enforces the same limits and does not change data on rejection', async () => {
  reset();
  const created = (await json('POST', '/', valid)).body.product;
  const bad = await json('PUT', `/${created._id}`, { ...valid, price: 20000000 });
  assert.equal(bad.status, 400);
  const badQty = await json('PUT', `/${created._id}`, { ...valid, quantity: 1001 });
  assert.equal(badQty.status, 400);
  assert.equal(store.get(created._id).price, 85000); // untouched
  assert.equal(store.get(created._id).quantity, 5);
  const good = await json('PUT', `/${created._id}`, { ...valid, price: 10000000, quantity: 1000 });
  assert.equal(good.status, 200);
});

// ---------- stock adjustment ----------
test('stock adjust: 900 + 100 accepted, 900 + 101 rejected, final stock is what counts', async () => {
  reset();
  const a = (await json('POST', '/', { ...valid, quantity: 900 })).body.product;
  const over = await json('PATCH', `/${a._id}/increase-stock`, { amount: 101 });
  assert.equal(over.status, 400);
  assert.match(over.body.message, /Current stock is 900; adding 101 would make it 1001/);
  assert.equal(store.get(a._id).quantity, 900);
  const exact = await json('PATCH', `/${a._id}/increase-stock`, { amount: 100 });
  assert.equal(exact.status, 200);
  assert.equal(store.get(a._id).quantity, 1000);
  const again = await json('PATCH', `/${a._id}/increase-stock`, { amount: 1 });
  assert.equal(again.status, 400);
});

test('stock adjust: 900 + 200 rejected', async () => {
  reset();
  const a = (await json('POST', '/', { ...valid, quantity: 900 })).body.product;
  assert.equal((await json('PATCH', `/${a._id}/increase-stock`, { amount: 200 })).status, 400);
});

test('stock adjust: invalid amounts rejected (decimal, negative, zero, huge, string)', async () => {
  reset();
  const a = (await json('POST', '/', { ...valid, quantity: 10 })).body.product;
  for (const amount of [1.5, -3, 0, 1001, 'abc', null]) {
    assert.equal((await json('PATCH', `/${a._id}/increase-stock`, { amount })).status, 400, `amount ${amount}`);
    assert.equal((await json('PATCH', `/${a._id}/decrease-stock`, { amount })).status, 400, `amount ${amount}`);
  }
  assert.equal((await json('PATCH', `/${a._id}/decrease-stock`, { amount: 11 })).status, 400); // below 0
  assert.equal((await json('PATCH', `/${a._id}/decrease-stock`, { amount: 10 })).status, 200);
  assert.equal(store.get(a._id).status, 'Out of Stock');
});

test('concurrent increases can never push stock above 1000', async () => {
  reset();
  const a = (await json('POST', '/', { ...valid, quantity: 900 })).body.product;
  const results = await Promise.all(
    Array.from({ length: 8 }, () => json('PATCH', `/${a._id}/increase-stock`, { amount: 60 }))
  );
  const okCount = results.filter((r) => r.status === 200).length;
  assert.equal(okCount, 1); // 900 + 60 = 960; a second +60 would be 1020
  assert.ok(store.get(a._id).quantity <= 1000);
});

// ---------- CSV import ----------
async function importCsv(csv, preview) {
  const form = new FormData();
  form.append('file', new Blob([csv], { type: 'text/csv' }), 'products.csv');
  const r = await fetch(`${base}/import?preview=${preview}`, { method: 'POST', body: form });
  return { status: r.status, body: await r.json() };
}

test('CSV import rejects bad rows, names the product + field, and imports the good ones', async () => {
  reset();
  const csv = [
    'name,sku,category,supplier,quantity,price,lowStockThreshold',
    'Good Phone,,Electronics,Acme,50,85000,10',
    'Max Phone,,Electronics,Acme,1000,10000000,10',
    'Too Many,,Electronics,Acme,1001,500,10',
    'Decimal Qty,,Electronics,Acme,10.5,500,10',
    'Negative Qty,,Electronics,Acme,-1,500,10',
    'Empty Qty,,Electronics,Acme,,500,10',
    'Too Pricey,,Electronics,Acme,5,10000000.01,10',
    'Trillion,,Electronics,Acme,5,1000000000000,10',
    'Zero Price,,Electronics,Acme,5,0,10',
  ].join('\n');

  const preview = await importCsv(csv, true);
  assert.equal(preview.status, 200);
  assert.equal(preview.body.summary.validRows, 2);
  assert.equal(preview.body.summary.invalidRows, 7);
  assert.equal(store.size, 0); // preview writes nothing

  const real = await importCsv(csv, false);
  assert.equal(real.status, 200);
  assert.equal(store.size, 2);

  const byProduct = Object.fromEntries(real.body.errors.map((e) => [e.product, e]));
  assert.equal(byProduct['Too Many'].field, 'quantity');
  assert.match(byProduct['Too Many'].reason, /Product "Too Many".*quantity "1001"/);
  assert.equal(byProduct['Too Pricey'].field, 'price');
  assert.match(byProduct['Too Pricey'].reason, /Maximum product price allowed is ₹1,00,00,000\./);
  assert.equal(byProduct['Trillion'].field, 'price');
  assert.equal(byProduct['Empty Qty'].field, 'quantity');
  assert.equal(byProduct['Zero Price'].field, 'price');
});
