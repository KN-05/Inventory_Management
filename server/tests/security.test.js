// tests/security.test.js - Phase 1 hardening. Run: node --test
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

const escapeRegex = require('../utils/escapeRegex');
const { clampLimit, MAX_PAGE_SIZE } = require('../utils/pagination');

test('escapeRegex makes search text literal and safe', () => {
  assert.equal(escapeRegex('A+B'), 'A\\+B');
  assert.doesNotThrow(() => new RegExp(escapeRegex('(')));
  assert.doesNotThrow(() => new RegExp(escapeRegex('[abc')));
  assert.equal(new RegExp(escapeRegex('(a+)+$'), 'i').test('x (a+)+$ y'), true);
  assert.equal(new RegExp(escapeRegex('(a+)+$'), 'i').test('aaaaaaaaaaaaaaaaaaaaaaaaaaaa!'), false);
});

test('escapeRegex never lets an array/object through and caps the length', () => {
  assert.equal(typeof escapeRegex(['a', 'b']), 'string');
  assert.equal(typeof escapeRegex({ $ne: 1 }), 'string');
  assert.equal(escapeRegex(undefined), '');
  assert.equal(escapeRegex('x'.repeat(5000)).length, 100);
});

test('clampLimit keeps ?limit= in range', () => {
  assert.equal(clampLimit(undefined), 20);
  assert.equal(clampLimit('abc'), 20);
  assert.equal(clampLimit('-5'), 20);
  assert.equal(clampLimit('0'), 20);
  assert.equal(clampLimit('50'), 50);
  assert.equal(clampLimit('1000'), 1000); // the Sales pickers use this
  assert.equal(clampLimit('1000000'), MAX_PAGE_SIZE);
});

test('login is rate limited after 10 FAILED attempts, but successful logins are not counted', async () => {
  let succeed = false;
  stub('controllers/authController.js', {
    registerUser: (q, r) => r.json({}),
    logoutUser: (q, r) => r.json({}),
    getMe: (q, r) => r.json({}),
    forgotPassword: (q, r) => r.json({ ok: true }),
    resetPassword: (q, r) => r.json({ ok: true }),
    loginUser: (q, r) => (succeed ? r.json({ success: true }) : r.status(401).json({ success: false, message: 'Invalid' })),
  });
  stub('middleware/authMiddleware.js', { protect: (q, r, n) => n() });
  delete require.cache[resolve('middleware/rateLimiters.js')];
  delete require.cache[resolve('routes/authRoutes.js')];
  const router = require('../routes/authRoutes');

  const app = express();
  app.use(express.json());
  app.use('/api/auth', router);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const post = (url, body) =>
    fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const creds = { email: 'a@b.com', password: 'x' };

  // 5 successful logins first: must not use up the allowance
  succeed = true;
  for (let i = 0; i < 5; i++) assert.equal((await post('/login', creds)).status, 200);

  succeed = false;
  for (let i = 0; i < 10; i++) assert.equal((await post('/login', creds)).status, 401);
  const blocked = await post('/login', creds);
  assert.equal(blocked.status, 429);
  const body = await blocked.json();
  assert.equal(body.success, false);
  assert.match(body.message, /Too many failed login attempts/);

  // forgot-password: 5 per hour, then 429
  for (let i = 0; i < 5; i++) assert.equal((await post('/forgot-password', { email: 'a@b.com' })).status, 200);
  assert.equal((await post('/forgot-password', { email: 'a@b.com' })).status, 429);

  server.close();
});

test('helmet keeps images loadable cross-origin and adds security headers', async () => {
  const helmet = require('helmet');
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.get('/x', (q, r) => r.send('ok'));
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/x`);
  assert.equal(res.headers.get('cross-origin-resource-policy'), 'cross-origin');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('x-powered-by') === null);
  server.close();
});
