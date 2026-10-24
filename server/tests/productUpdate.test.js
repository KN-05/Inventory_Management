// tests/productUpdate.test.js - editing a product (GST rates etc.), including
// OLD products that were created before barcodes existed and so have none.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const stub = (rel, exports) => {
  const file = require.resolve(path.join(__dirname, '..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};

let current;
const makeProduct = (over = {}) => ({
  _id: 'p1', name: 'Dell G15', quantity: 39, price: 90000, lowStockThreshold: 10,
  sgstRate: 0, cgstRate: 0, igstRate: 0, status: 'In Stock',
  async save() { return this; },
  ...over,
});
stub('models/Product.js', {
  findById: async () => current,
  findOne: async () => null,
});
stub('utils/logActivity.js', async () => {});

const { updateProduct } = require('../controllers/productController');

const put = (body, role = 'admin') =>
  new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(b) { resolve({ status: this.statusCode, body: b }); },
    };
    updateProduct({ params: { id: 'p1' }, body, user: { _id: 'u1', role } }, res, (err) =>
      resolve({ status: res.statusCode, error: err })
    );
  });

const editPayload = (over = {}) => ({
  name: 'Dell G15', category: 'c1', supplier: 's1', quantity: 39, price: 90000,
  lowStockThreshold: 10, sgstRate: 9, cgstRate: 9, igstRate: 0, ...over,
});

test('GST rates are saved on an edit', async () => {
  current = makeProduct({ barcode: '0121225650460' });
  const r = await put(editPayload({ barcode: '0121225650460' }));
  assert.equal(r.status, 200);
  assert.equal(current.sgstRate, 9);
  assert.equal(current.cgstRate, 9);
});

test('OLD product with NO barcode: the form sends barcode "" - the edit must still save', async () => {
  current = makeProduct(); // no barcode field at all
  const r = await put(editPayload({ barcode: '' }));
  assert.equal(r.status, 200, r.error?.message);
  assert.equal(current.sgstRate, 9);
  assert.equal(current.cgstRate, 9);
  assert.equal(current.barcode, undefined, 'a blank barcode must not be stored');
});

test('OLD product with no barcode: typing a barcode in still works', async () => {
  current = makeProduct();
  const r = await put(editPayload({ barcode: '  999111  ' }));
  assert.equal(r.status, 200);
  assert.equal(current.barcode, '999111');
});

test('clearing an EXISTING barcode is still refused', async () => {
  current = makeProduct({ barcode: '0121225650460' });
  const r = await put(editPayload({ barcode: '   ' }));
  assert.equal(r.status, 400);
  assert.match(r.error.message, /Barcode cannot be empty/);
});

test('staff still cannot change a barcode', async () => {
  current = makeProduct({ barcode: '111' });
  const r = await put(editPayload({ barcode: '222' }), 'staff');
  assert.equal(r.status, 403);
});
