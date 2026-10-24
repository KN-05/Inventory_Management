// tests/stockFlow.test.js - sale / cancel / receive flows with in-memory fake
// models. The fakes apply each conditional update synchronously (like one
// MongoDB operation), so these tests prove the LOGIC: atomic claims,
// all-or-nothing, rollback. They cannot prove MongoDB itself behaves that way
// - run a real concurrent check on your own database too.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const stub = (rel, exports) => {
  const file = require.resolve(path.join(__dirname, '..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
const thenable = (value) => {
  const p = Promise.resolve(value);
  p.select = () => p;
  p.populate = () => p;
  return p;
};

// ---------- fake data stores ----------
let products, sales, purchases, customers, movements, failSaleCreate, nextId;
const reset = () => {
  products = new Map(); sales = new Map(); purchases = new Map(); customers = new Map();
  movements = []; failSaleCreate = false; nextId = 1;
};
const makeProduct = (name, quantity, extra = {}) => {
  const doc = {
    _id: `p${nextId++}`, name, quantity, price: 100, lowStockThreshold: 10, status: 'In Stock',
    sgstRate: 0, cgstRate: 0, igstRate: 0, ...extra,
    calculateStatus() { return this.quantity <= 0 ? 'Out of Stock' : this.quantity <= this.lowStockThreshold ? 'Low Stock' : 'In Stock'; },
    async save() { return this; },
  };
  products.set(doc._id, doc);
  return doc;
};

stub('models/Product.js', {
  find: async (f) => [...products.values()].filter((p) => f._id.$in.map(String).includes(String(p._id))),
  findById: (id) => thenable(products.get(String(id)) || null),
  async findOneAndUpdate(filter, update) {
    const doc = products.get(String(filter._id));
    if (!doc) return null;
    const q = filter.quantity || {};
    if (q.$lte !== undefined && !(doc.quantity <= q.$lte)) return null;
    if (q.$gte !== undefined && !(doc.quantity >= q.$gte)) return null;
    doc.quantity += update.$inc.quantity;
    return doc;
  },
  async updateOne(filter, update) {
    const doc = products.get(String(filter._id));
    if (doc) doc.quantity += update.$inc.quantity;
  },
});
stub('models/Customer.js', {
  findById: async (id) => customers.get(String(id)) || null,
  async updateOne(filter, update) {
    const c = customers.get(String(filter._id));
    if (!c) return;
    if (Array.isArray(update)) c.totalPurchases = 0; // cancel path: only the "never below zero" pipeline
    else c.totalPurchases += update.$inc.totalPurchases;
  },
});
stub('models/Sale.js', {
  async create(data) {
    if (failSaleCreate) throw new Error('database exploded');
    const doc = { _id: `s${nextId++}`, status: 'completed', ...data };
    sales.set(doc._id, doc);
    return doc;
  },
  async findOneAndUpdate(filter, update) {
    const doc = sales.get(String(filter._id));
    if (!doc || doc.status !== filter.status) return null;
    Object.assign(doc, update);
    return doc;
  },
  async exists(f) { return sales.has(String(f._id)) ? { _id: f._id } : null; },
  async updateOne(f, u) { Object.assign(sales.get(String(f._id)), u); },
  findById: (id) => thenable(sales.get(String(id)) || null),
});
stub('models/Purchase.js', {
  findById: (id) => thenable(purchases.get(String(id)) || null),
  async findOneAndUpdate(filter, update) {
    const doc = purchases.get(String(filter._id));
    if (!doc || doc.status !== filter.status) return null;
    Object.assign(doc, update);
    return doc;
  },
  async updateOne(f, u) { Object.assign(purchases.get(String(f._id)), u); },
});
stub('models/StockMovement.js', { create: async (m) => { movements.push(m); return m; } });
stub('utils/logActivity.js', async () => {});
stub('utils/createNotification.js', async () => {});
stub('utils/generateInvoiceNumber.js', { generateUniqueInvoiceNumber: async () => `INV-${nextId++}` });

const { createSale, cancelSale } = require('../controllers/saleController');
const { receivePurchase } = require('../controllers/purchaseController');

// asyncHandler does not return its promise, so wait for res.json / next(err)
const call = (handler, req) =>
  new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(body) { resolve({ status: this.statusCode, body }); },
    };
    handler({ user: { _id: 'u1', role: 'admin' }, params: {}, body: {}, query: {}, ...req }, res, (err) =>
      resolve({ status: res.statusCode >= 400 ? res.statusCode : 500, error: err })
    );
  });
const sellReq = (items) => ({ body: { items, paymentMethod: 'Cash', paymentStatus: 'paid' } });

test('two cashiers selling the LAST unit at once: exactly one sale, stock never negative', async () => {
  reset();
  const p = makeProduct('Phone', 1);
  const [a, b] = await Promise.all([
    call(createSale, sellReq([{ product: p._id, quantity: 1 }])),
    call(createSale, sellReq([{ product: p._id, quantity: 1 }])),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 400]);
  assert.equal(p.quantity, 0);
  assert.equal(sales.size, 1);
  assert.equal(movements.length, 1);
});

test('a multi-item sale where the 2nd item fails rolls back the 1st and creates no sale', async () => {
  reset();
  const a = makeProduct('A', 5);
  const b = makeProduct('B', 5);
  // B is bought out between the pre-check and the reservation
  const originalFind = require('../models/Product').find;
  require('../models/Product').find = async (f) => {
    const docs = await originalFind(f);
    b.quantity = 0; // someone else took it just now
    return docs.map((d) => (d === b ? { ...b, quantity: 5, calculateStatus: b.calculateStatus, save: b.save } : d));
  };
  const r = await call(createSale, sellReq([{ product: a._id, quantity: 2 }, { product: b._id, quantity: 2 }]));
  require('../models/Product').find = originalFind;
  assert.equal(r.status, 400);
  assert.equal(a.quantity, 5, 'first product put back');
  assert.equal(sales.size, 0);
  assert.equal(movements.length, 0);
});

test('if saving the sale fails, the reserved stock is given back', async () => {
  reset();
  const p = makeProduct('Phone', 10);
  failSaleCreate = true;
  const r = await call(createSale, sellReq([{ product: p._id, quantity: 4 }]));
  assert.notEqual(r.status, 201);
  assert.equal(p.quantity, 10);
});

test('a normal sale decreases stock and records one movement per line', async () => {
  reset();
  const p = makeProduct('Phone', 10);
  const c = { _id: 'c1', totalPurchases: 0 }; customers.set('c1', c);
  const r = await call(createSale, { body: { customer: 'c1', items: [{ product: p._id, quantity: 3 }], paymentMethod: 'Cash', paymentStatus: 'paid' } });
  assert.equal(r.status, 201);
  assert.equal(p.quantity, 7);
  assert.equal(movements[0].quantity, -3);
  assert.equal(movements[0].previousStock, 10);
  assert.equal(movements[0].newStock, 7);
  assert.ok(c.totalPurchases > 0);
});

test('cancelling the same sale twice at once restores stock only once', async () => {
  reset();
  const p = makeProduct('Phone', 10);
  const sale = { _id: 's9', status: 'completed', invoiceNumber: 'INV-9', totalAmount: 100, items: [{ product: p._id, quantity: 3 }] };
  sales.set('s9', sale);
  const [a, b] = await Promise.all([call(cancelSale, { params: { id: 's9' } }), call(cancelSale, { params: { id: 's9' } })]);
  assert.deepEqual([a.status, b.status].sort(), [200, 400]);
  assert.equal(p.quantity, 13);
  assert.equal(sale.status, 'cancelled');
});

test('cancel that would push stock above 1000 is refused and the sale stays completed', async () => {
  reset();
  const p = makeProduct('Phone', 990);
  const sale = { _id: 's9', status: 'completed', invoiceNumber: 'INV-9', totalAmount: 100, items: [{ product: p._id, quantity: 20 }] };
  sales.set('s9', sale);
  const r = await call(cancelSale, { params: { id: 's9' } });
  assert.equal(r.status, 400);
  assert.equal(p.quantity, 990);
  assert.equal(sale.status, 'completed');
});

const makePurchase = (items) => {
  const doc = { _id: 'pu1', status: 'pending', purchaseNumber: 'PO-1', items: items.map((i) => ({ product: { _id: i.product }, quantity: i.quantity })) };
  purchases.set('pu1', doc);
  return doc;
};

test('receiving the same purchase twice at once adds the stock only once', async () => {
  reset();
  const p = makeProduct('Phone', 10);
  makePurchase([{ product: p._id, quantity: 50 }]);
  const [a, b] = await Promise.all([call(receivePurchase, { params: { id: 'pu1' } }), call(receivePurchase, { params: { id: 'pu1' } })]);
  assert.deepEqual([a.status, b.status].sort(), [200, 400]);
  assert.equal(p.quantity, 60);
});

test('receive that would exceed 1000 is refused and the purchase goes back to pending', async () => {
  reset();
  const p = makeProduct('Phone', 900);
  const purchase = makePurchase([{ product: p._id, quantity: 101 }]);
  const r = await call(receivePurchase, { params: { id: 'pu1' } });
  assert.equal(r.status, 400);
  assert.equal(p.quantity, 900);
  assert.equal(purchase.status, 'pending');
});

test('receive: stock 900 + 100 is accepted', async () => {
  reset();
  const p = makeProduct('Phone', 900);
  makePurchase([{ product: p._id, quantity: 100 }]);
  const r = await call(receivePurchase, { params: { id: 'pu1' } });
  assert.equal(r.status, 200);
  assert.equal(p.quantity, 1000);
});
