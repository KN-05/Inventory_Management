// tests/tenant.mongo.test.js - REAL MongoDB integration tests for the
// multi-business sign-up flow and data isolation.
//
//   MONGO_TEST_URI=mongodb://127.0.0.1:27017 node --test tests/tenant.mongo.test.js
//
// Skipped automatically when MONGO_TEST_URI is not set (so plain `npm test`
// still works without a database). Each run uses its own throw-away database.
//
// What is NOT real here: the call to Google. The tests cannot reach Google, so
// googleVerifier.verify() is replaced by a function that returns a chosen
// profile. Everything else - routes, validation, auth middleware, tenant
// scoping, onboarding, MongoDB - is the real code.

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const MONGO = process.env.MONGO_TEST_URI;

test('multi-business sign-up and isolation (real MongoDB)', { skip: !MONGO && 'MONGO_TEST_URI not set' }, async (t) => {
  process.env.JWT_SECRET = 'integration-secret-integration-secret-123456';
  process.env.RATE_LIMIT_DISABLED = 'true';
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

  const express = require('express');
  const mongoose = require('mongoose');
  const googleVerifier = require('../utils/googleVerifier');
  const { errorHandler } = require('../middleware/errorMiddleware');

  require('node:fs').readdirSync(require('node:path').join(__dirname, '..', 'models')).forEach((f) =>
    require(`../models/${f}`)
  );
  const User = require('../models/User');
  const Business = require('../models/Business');
  const Product = require('../models/Product');

  await mongoose.connect(`${MONGO}/tenant_test_${Date.now()}`);
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).init()));

  const { plansRouter, subscriptionRouter } = require('../routes/subscriptionRoutes');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/authRoutes'));
  app.use('/api/onboarding', require('../routes/onboardingRoutes'));
  app.use('/api/plans', plansRouter);
  app.use('/api/subscription', subscriptionRouter);
  app.use('/api/products', require('../routes/productRoutes'));
  app.use('/api/categories', require('../routes/categoryRoutes'));
  app.use('/api/suppliers', require('../routes/supplierRoutes'));
  app.use('/api/dashboard', require('../routes/dashboardRoutes'));
  app.use('/api/admin', require('../routes/adminRoutes'));
  app.use('/api/sales', require('../routes/saleRoutes'));
  app.use(errorHandler);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/api`;

  t.after(async () => {
    server.close();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const api = async (method, path, { token, body } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };

  // fake Google: credential string -> profile
  const googleProfiles = {};
  googleVerifier.verify = async (credential) => {
    if (!googleProfiles[credential]) throw new Error('invalid token');
    return googleProfiles[credential];
  };
  const google = (credential, intent) => api('POST', '/auth/google', { body: { credential, intent } });

  const DETAILS = { businessName: 'Sharma Traders', businessType: 'Retail', gstin: '09ABCDE1234F1Z5', phone: '9876543210', address: 'Agra' };

  // Creates a complete business with an admin; returns { token, userId, businessId }
  async function newBusiness(label) {
    googleProfiles[`g-${label}`] = { sub: `sub-${label}`, email: `${label}@example.com`, emailVerified: true, name: `Owner ${label}` };
    const signup = await google(`g-${label}`, 'signup');
    assert.equal(signup.status, 201, JSON.stringify(signup.body));
    let token = signup.body.token;
    assert.equal((await api('PUT', '/onboarding/details', { token, body: { ...DETAILS, businessName: `Business ${label}` } })).status, 200);
    assert.equal((await api('PUT', '/onboarding/plan', { token, body: { planId: 'growth', billingCycle: 'yearly' } })).status, 200);
    const done = await api('POST', '/onboarding/complete', { token });
    assert.equal(done.status, 201, JSON.stringify(done.body));
    token = done.body.token;
    return { token, userId: done.body.user.id, businessId: done.body.workspace.business.id };
  }

  async function addProduct(biz, name, sku) {
    const cat = await api('POST', '/categories', { token: biz.token, body: { name: `Cat-${name}` } });
    const sup = await api('POST', '/suppliers', { token: biz.token, body: { name: `Sup-${name}`, email: `s-${name.replace(/\s+/g, '')}@x.com`, phone: '9999999999' } });
    assert.equal(cat.status, 201, JSON.stringify(cat.body));
    assert.equal(sup.status, 201, JSON.stringify(sup.body));
    const p = await api('POST', '/products', {
      token: biz.token,
      body: { name, sku, category: cat.body.category._id, supplier: sup.body.supplier._id, quantity: 10, price: 1000, lowStockThreshold: 2 },
    });
    assert.equal(p.status, 201, JSON.stringify(p.body));
    return p.body.product;
  }

  await t.test('public plans list says payment is not connected', async () => {
    const r = await api('GET', '/plans');
    assert.equal(r.status, 200);
    assert.equal(r.body.paymentConnected, false);
    assert.equal(r.body.plans.length, 3);
  });

  await t.test('Google sign-up makes a PENDING, non-admin account that cannot reach inventory data', async () => {
    googleProfiles.g1 = { sub: 'sub-1', email: 'new.owner@example.com', emailVerified: true, name: 'New Owner' };
    const r = await google('g1', 'signup');
    assert.equal(r.status, 201);
    assert.equal(r.body.next, 'onboarding');
    assert.equal(r.body.user.role, 'staff'); // never admin / super admin from public sign-up
    assert.equal(r.body.user.business, null);
    const blocked = await api('GET', '/products', { token: r.body.token });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, 'ONBOARDING_REQUIRED');
    assert.equal((await api('GET', '/dashboard/summary', { token: r.body.token })).status, 403);
    assert.equal((await api('GET', '/auth/me', { token: r.body.token })).status, 200); // /me still works
    assert.equal(await Business.countDocuments(), 0, 'no business and no paid access before onboarding is completed');
  });

  await t.test('incomplete sign-up can be resumed: progress is saved and reported at the next sign-in', async () => {
    const first = await google('g1', 'signup');
    assert.equal(first.status, 200, 'second Google sign-up with the same account is a sign-in, not a new account');
    assert.equal(first.body.isNewAccount, false);
    const saved = await api('PUT', '/onboarding/details', { token: first.body.token, body: DETAILS });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.onboarding.step, 'plan');
    const again = await google('g1', 'signin'); // "came back later"
    assert.equal(again.body.next, 'onboarding');
    const state = await api('GET', '/onboarding', { token: again.body.token });
    assert.equal(state.body.onboarding.businessName, 'Sharma Traders');
    assert.equal(state.body.onboarding.step, 'plan');
    assert.equal(await User.countDocuments({ email: 'new.owner@example.com' }), 1);
    // cannot complete without choosing a plan
    assert.equal((await api('POST', '/onboarding/complete', { token: again.body.token })).status, 400);
  });

  await t.test('completing onboarding (5 parallel clicks) creates exactly ONE business and makes the user its Admin', async () => {
    const login = await google('g1', 'signin');
    const token = login.body.token;
    assert.equal((await api('PUT', '/onboarding/plan', { token, body: { planId: 'pro', billingCycle: 'monthly' } })).status, 200);
    const results = await Promise.all(Array.from({ length: 5 }, () => api('POST', '/onboarding/complete', { token })));
    results.forEach((r) => assert.ok([200, 201].includes(r.status), JSON.stringify(r.body)));
    assert.equal(await Business.countDocuments({ name: 'Sharma Traders' }), 1);
    const user = await User.findOne({ email: 'new.owner@example.com' });
    assert.equal(user.role, 'admin');
    assert.ok(user.business);
    const biz = await Business.findById(user.business);
    assert.equal(biz.subscription.status, 'trial');
    assert.equal(biz.subscription.paymentProvider, 'none');
    assert.equal(biz.plan.planId, 'pro');
    // the new token works and shows the dashboard path
    const adminToken = results.find((r) => r.body.token).body.token;
    const me = await api('GET', '/auth/me', { token: adminToken });
    assert.equal(me.body.next, 'dashboard');
    assert.equal(me.body.user.role, 'admin');
    assert.equal((await api('GET', '/products', { token: adminToken })).status, 200);
  });

  await t.test('signing in again never asks an existing business owner to register or pick a plan again', async () => {
    const r = await google('g1', 'signup'); // even pressing "New user" again
    assert.equal(r.status, 200);
    assert.equal(r.body.next, 'dashboard');
    assert.equal(r.body.isNewAccount, false);
    assert.equal(await Business.countDocuments({ name: 'Sharma Traders' }), 1);
  });

  await t.test('Google sign-in for an unknown email is refused (no hidden account creation)', async () => {
    googleProfiles.gx = { sub: 'sub-x', email: 'stranger@example.com', emailVerified: true, name: 'Stranger' };
    const r = await google('gx', 'signin');
    assert.equal(r.status, 404);
    assert.match(r.body.message, /New User/);
    assert.equal(await User.countDocuments({ email: 'stranger@example.com' }), 0);
  });

  await t.test('Google failures: bad token, unverified email, server without client id', async () => {
    assert.equal((await google('does-not-exist', 'signin')).status, 401);
    googleProfiles.gu = { sub: 'sub-u', email: 'unverified@example.com', emailVerified: false, name: 'U' };
    assert.equal((await google('gu', 'signup')).status, 401);
    const saved = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    assert.equal((await google('g1', 'signin')).status, 503);
    process.env.GOOGLE_CLIENT_ID = saved;
  });

  await t.test('6 simultaneous Google sign-ups of the same account make ONE user', async () => {
    googleProfiles.gr = { sub: 'sub-race', email: 'race@example.com', emailVerified: true, name: 'Race' };
    const rs = await Promise.all(Array.from({ length: 6 }, () => google('gr', 'signup')));
    rs.forEach((r) => assert.ok([200, 201].includes(r.status), JSON.stringify(r.body)));
    assert.equal(await User.countDocuments({ email: 'race@example.com' }), 1);
  });

  await t.test('existing e-mail/password user: normal login works and Google links to the SAME account', async () => {
    const legacy = await User.create({ name: 'Old Admin', email: 'legacy@example.com', password: 'secret123', role: 'admin' });
    const login = await api('POST', '/auth/login', { body: { email: 'legacy@example.com', password: 'secret123' } });
    assert.equal(login.status, 200);
    assert.equal(login.body.next, 'dashboard');
    googleProfiles.gl = { sub: 'sub-legacy', email: 'legacy@example.com', emailVerified: true, name: 'Old Admin' };
    const viaGoogle = await google('gl', 'signin');
    assert.equal(viaGoogle.status, 200);
    assert.equal(viaGoogle.body.user.id, String(legacy._id));
    assert.equal(await User.countDocuments({ email: 'legacy@example.com' }), 1);
    // and a DIFFERENT Google account with the same email is refused
    googleProfiles.gl2 = { sub: 'sub-other', email: 'legacy@example.com', emailVerified: true, name: 'Impostor' };
    assert.equal((await google('gl2', 'signin')).status, 409);
  });

  await t.test('e-mail sign-up: pending account, role from the request body is ignored, duplicates refused', async () => {
    const r = await api('POST', '/auth/signup', { body: { name: 'Mail Owner', email: 'mail@example.com', password: 'longenough1', role: 'admin', business: '64b000000000000000000000' } });
    assert.equal(r.status, 201);
    assert.equal(r.body.user.role, 'staff');
    assert.equal(r.body.user.business, null);
    assert.equal(r.body.next, 'onboarding');
    assert.equal((await api('POST', '/auth/signup', { body: { name: 'Again', email: 'MAIL@example.com', password: 'longenough1' } })).status, 409);
    assert.equal((await api('POST', '/auth/signup', { body: { name: 'Weak', email: 'weak@example.com', password: 'short' } })).status, 400);
  });

  // ------------------------------------------------------------------ isolation
  const A = await newBusiness('alpha');
  const B = await newBusiness('beta');
  const legacyLogin = await api('POST', '/auth/login', { body: { email: 'legacy@example.com', password: 'secret123' } });
  const L = { token: legacyLogin.body.token };

  const pLegacy = await addProduct(L, 'Legacy Item', 'SKU-SAME');
  const pA = await addProduct(A, 'Alpha Item', 'SKU-SAME'); // same SKU in a different business is allowed
  const pB = await addProduct(B, 'Beta Item', 'SKU-B');

  await t.test('each business sees only its own products; the original workspace only its own', async () => {
    const names = async (biz) => (await api('GET', '/products', { token: biz.token })).body.products.map((p) => p.name).sort();
    assert.deepEqual(await names(A), ['Alpha Item']);
    assert.deepEqual(await names(B), ['Beta Item']);
    assert.deepEqual(await names(L), ['Legacy Item']);
  });

  await t.test('another business\'s record cannot be read, edited, deleted or have its stock changed', async () => {
    assert.equal((await api('GET', `/products/${pB._id}`, { token: A.token })).status, 404);
    assert.equal((await api('PUT', `/products/${pB._id}`, { token: A.token, body: { name: 'Hacked', category: pA.category, supplier: pA.supplier, quantity: 5, price: 1 } })).status, 404);
    assert.equal((await api('PATCH', `/products/${pB._id}/increase-stock`, { token: A.token, body: { amount: 5 } })).status, 404);
    assert.equal((await api('PATCH', `/products/${pB._id}/decrease-stock`, { token: A.token, body: { amount: 5 } })).status, 404);
    assert.equal((await api('DELETE', `/products/${pB._id}`, { token: A.token })).status, 404);
    assert.equal((await api('GET', `/products/${pA._id}`, { token: B.token })).status, 404);
    const intact = await Product.findById(pB._id);
    assert.equal(intact.name, 'Beta Item');
    assert.equal(intact.quantity, 10);
    assert.equal(String(intact.business), B.businessId);
  });

  await t.test('a client-supplied business id is ignored on create', async () => {
    const cat = await api('POST', '/categories', { token: A.token, body: { name: 'Forged', business: B.businessId } });
    assert.equal(cat.status, 201);
    const stored = await mongoose.model('Category').findById(cat.body.category._id);
    assert.equal(String(stored.business), A.businessId);
  });

  await t.test('the same category name is allowed in separate businesses but not twice in one business', async () => {
    const first = await api('POST', '/categories', { token: A.token, body: { name: 'Electronics' } });
    const second = await api('POST', '/categories', { token: B.token, body: { name: 'Electronics' } });
    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(second.status, 201, JSON.stringify(second.body));

    const duplicateInA = await api('POST', '/categories', { token: A.token, body: { name: 'Electronics' } });
    assert.equal(duplicateInA.status, 400);
    assert.match(duplicateInA.body.message, /already exists|Duplicate value/i);

    const visibleToA = (await api('GET', '/categories', { token: A.token })).body.categories;
    const visibleToB = (await api('GET', '/categories', { token: B.token })).body.categories;
    assert.equal(visibleToA.filter((category) => category.name === 'Electronics').length, 1);
    assert.equal(visibleToB.filter((category) => category.name === 'Electronics').length, 1);
    assert.notEqual(String(first.body.category._id), String(second.body.category._id));
  });

  await t.test('categories, suppliers, dashboard and users are scoped too', async () => {
    const catNames = (await api('GET', '/categories', { token: B.token })).body.categories.map((c) => c.name);
    assert.ok(!catNames.some((n) => n.includes('Alpha')));
    const supNames = (await api('GET', '/suppliers', { token: A.token })).body.suppliers.map((s) => s.name);
    assert.ok(supNames.every((n) => !n.includes('Beta')));
    const dash = await api('GET', '/dashboard/summary', { token: A.token });
    assert.equal(dash.body.summary.totalProducts, 1);
    assert.equal(dash.body.summary.totalCategories, 3); // Cat-Alpha Item + Forged + Electronics
    const usersA = await api('GET', '/admin/users', { token: A.token });
    assert.deepEqual(usersA.body.users.map((u) => u.email), ['alpha@example.com']);
  });

  await t.test('a business cannot sell another business\'s product', async () => {
    const r = await api('POST', '/sales', { token: A.token, body: { items: [{ product: pB._id, quantity: 1 }], paymentMethod: 'Cash', paymentStatus: 'paid' } });
    assert.ok([400, 404].includes(r.status), `status ${r.status}`);
    assert.equal((await Product.findById(pB._id)).quantity, 10);
  });

  await t.test('an existing staff account cannot be promoted into an Admin of the same business', async () => {
    const created = await api('POST', '/admin/users', { token: A.token, body: { name: 'Future Owner', email: 'future-owner@example.com', password: 'staffpass1', role: 'staff' } });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const promoted = await api('PATCH', `/admin/users/${created.body.user.id}/role`, { token: A.token, body: { role: 'admin' } });
    assert.equal(promoted.status, 400);
    assert.match(promoted.body.message, /independent business account/i);
  });

  await t.test('staff created by Admin A belongs to business A only and cannot use admin routes', async () => {
    const created = await api('POST', '/admin/users', { token: A.token, body: { name: 'Staffer', email: 'staffer@example.com', password: 'staffpass1', role: 'staff' } });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const login = await api('POST', '/auth/login', { body: { email: 'staffer@example.com', password: 'staffpass1' } });
    const staffToken = login.body.token;
    assert.equal(login.body.next, 'dashboard');
    assert.deepEqual((await api('GET', '/products', { token: staffToken })).body.products.map((p) => p.name), ['Alpha Item']);
    assert.equal((await api('GET', '/admin/users', { token: staffToken })).status, 403);
    assert.equal((await api('DELETE', `/products/${pA._id}`, { token: staffToken })).status, 403);
    assert.equal((await api('GET', '/products')).status, 401);
  });

  await t.test('expired trial: data access is paused (402) but data is kept, /me and /subscription still work, renewal restores it', async () => {
    await Business.updateOne({ _id: B.businessId }, { $set: { 'subscription.trialEndsAt': new Date(Date.now() - 86400000) } });
    const blocked = await api('GET', '/products', { token: B.token });
    assert.equal(blocked.status, 402);
    assert.equal(blocked.body.code, 'SUBSCRIPTION_EXPIRED');
    assert.equal((await api('GET', '/dashboard/summary', { token: B.token })).status, 402);
    const me = await api('GET', '/auth/me', { token: B.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.next, 'renew');
    assert.equal(me.body.workspace.subscription.status, 'expired');
    const sub = await api('GET', '/subscription', { token: B.token });
    assert.equal(sub.status, 200);
    assert.equal(sub.body.subscription.paymentConnected, false);
    assert.equal(await Product.countDocuments({ _id: pB._id }), 1, 'expired business data is not deleted');
    // login says "renew", and the other business is unaffected
    const login = await google('g-beta', 'signin');
    assert.equal(login.body.next, 'renew');
    assert.equal((await api('GET', '/products', { token: A.token })).status, 200);
    // extending the period (done by the platform owner) restores access
    await Business.updateOne({ _id: B.businessId }, { $set: { 'subscription.trialEndsAt': new Date(Date.now() + 86400000) } });
    assert.equal((await api('GET', '/products', { token: B.token })).status, 200);
  });

  await t.test('an old token for a deactivated or deleted user is refused', async () => {
    await User.updateOne({ _id: A.userId }, { $set: { isActive: false } });
    assert.equal((await api('GET', '/products', { token: A.token })).status, 403);
    await User.updateOne({ _id: A.userId }, { $set: { isActive: true } });
  });
});
