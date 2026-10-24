// tests/auth.test.js - login, the "protect" token check and role/permission
// gates. The User model is replaced with a small fake; JWT signing/verifying
// and the permission table are the REAL code.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-12345';

const stub = (rel, exports) => {
  const file = require.resolve(path.join(__dirname, '..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};

let users;
const makeUser = (over = {}) => ({
  _id: 'u1', name: 'Test', email: 'a@b.com', role: 'staff', isActive: true,
  matchPassword: async (pw) => pw === 'correct-password',
  save: async () => {},
  ...over,
});
const thenableWithSelect = (value) => { const p = Promise.resolve(value); p.select = () => p; return p; };
stub('models/User.js', {
  findOne: ({ email }) => thenableWithSelect(users.find((u) => u.email === email) || null),
  findById: async (id) => users.find((u) => u._id === id) || null,
});
stub('utils/logActivity.js', async () => {});
stub('utils/sendEmail.js', async () => {});

const { loginUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorize, requirePermission } = require('../middleware/roleMiddleware');
const { PERMISSIONS, roleHasPermission } = require('../config/permissions');

// asyncHandler does not return its promise: wait for res.json or next(err)
const run = (handler, req) =>
  new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(body) { resolve({ status: this.statusCode, body }); },
    };
    const request = Object.assign(req, { headers: {}, body: {}, ...req }); // same object, so callers can inspect req.user
    const next = (err) => resolve({ status: res.statusCode, error: err, passed: !err });
    try {
      handler(request, res, next);
    } catch (err) {
      next(err); // authorize / requirePermission throw synchronously; Express turns that into next(err)
    }
  });

test('login: correct credentials return a signed token', async () => {
  users = [makeUser()];
  const r = await run(loginUser, { body: { email: 'A@B.com ', password: 'correct-password' } });
  assert.equal(r.status, 200);
  const decoded = jwt.verify(r.body.token, process.env.JWT_SECRET);
  assert.equal(decoded.id, 'u1');
  assert.equal(decoded.role, 'staff');
});

test('login: wrong password and unknown email give the SAME 401 message', async () => {
  users = [makeUser()];
  const wrong = await run(loginUser, { body: { email: 'a@b.com', password: 'nope' } });
  const unknown = await run(loginUser, { body: { email: 'nobody@b.com', password: 'x' } });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.error.message, unknown.error.message); // no hint which emails exist
});

test('login: a deactivated account cannot log in even with the right password', async () => {
  users = [makeUser({ isActive: false })];
  const r = await run(loginUser, { body: { email: 'a@b.com', password: 'correct-password' } });
  assert.equal(r.status, 403);
});

test('protect: missing, malformed and forged tokens are rejected with 401', async () => {
  users = [makeUser()];
  assert.equal((await run(protect, {})).status, 401);
  assert.equal((await run(protect, { headers: { authorization: 'Bearer not.a.token' } })).status, 401);
  const forged = jwt.sign({ id: 'u1', role: 'admin' }, 'some-other-secret');
  assert.equal((await run(protect, { headers: { authorization: `Bearer ${forged}` } })).status, 401);
  const expired = jwt.sign({ id: 'u1' }, process.env.JWT_SECRET, { expiresIn: -10 });
  assert.equal((await run(protect, { headers: { authorization: `Bearer ${expired}` } })).status, 401);
});

test('protect: a valid token passes and loads the user fresh from the database', async () => {
  users = [makeUser({ role: 'manager' })];
  // token CLAIMS admin, but the database says manager - the database wins
  const token = jwt.sign({ id: 'u1', role: 'admin' }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const r = await run(protect, req);
  assert.equal(r.passed, true);
  assert.equal(req.user.role, 'manager');
});

test('protect: a user deactivated after the token was issued is locked out (403)', async () => {
  users = [makeUser({ isActive: false })];
  const token = jwt.sign({ id: 'u1', role: 'staff' }, process.env.JWT_SECRET);
  assert.equal((await run(protect, { headers: { authorization: `Bearer ${token}` } })).status, 403);
});

test('protect: a deleted user\'s old token is rejected', async () => {
  users = [];
  const token = jwt.sign({ id: 'u1', role: 'staff' }, process.env.JWT_SECRET);
  assert.equal((await run(protect, { headers: { authorization: `Bearer ${token}` } })).status, 401);
});

test('authorize: only the listed roles get through', async () => {
  const adminOnly = authorize('admin');
  assert.equal((await run(adminOnly, { user: { role: 'admin' } })).passed, true);
  assert.equal((await run(adminOnly, { user: { role: 'manager' } })).status, 403);
  assert.equal((await run(adminOnly, { user: { role: 'staff' } })).status, 403);
  assert.equal((await run(adminOnly, {})).status, 401);
});

test('permission table: staff cannot delete products or receive purchases; admin can', () => {
  assert.equal(roleHasPermission('admin', PERMISSIONS.PRODUCTS_DELETE), true);
  assert.equal(roleHasPermission('staff', PERMISSIONS.PRODUCTS_DELETE), false);
  assert.equal(roleHasPermission('staff', PERMISSIONS.PURCHASES_RECEIVE), false);
  assert.equal(roleHasPermission('manager', PERMISSIONS.PURCHASES_RECEIVE), true);
  assert.equal(roleHasPermission('staff', PERMISSIONS.SALES_CREATE), true);
  assert.equal(roleHasPermission('staff', PERMISSIONS.SALES_CANCEL), false);
  assert.equal(roleHasPermission('hacker', PERMISSIONS.PRODUCTS_VIEW), false);
  assert.equal(roleHasPermission(undefined, PERMISSIONS.PRODUCTS_VIEW), false);
});

test('requirePermission: enforced per role', async () => {
  const canDelete = requirePermission(PERMISSIONS.PRODUCTS_DELETE);
  assert.equal((await run(canDelete, { user: { role: 'admin' } })).passed, true);
  assert.equal((await run(canDelete, { user: { role: 'staff' } })).status, 403);
  assert.equal((await run(canDelete, {})).status, 401);
});
