const assert = require('node:assert/strict');
const test = require('node:test');
process.env.SESSION_SECRET ||= 'test-session-secret';
const app = require('../server');
const {
  mergeProductsWithLocalOverrides,
  secureEquals,
} = require('../server');

test('does not restore stale local products missing from Supabase', () => {
  const products = mergeProductsWithLocalOverrides(
    [{ id: 'remote-product', name: 'Remote product' }],
    [
      { id: 'deleted-product', name: 'Deleted product' },
      { id: 'local-product', name: 'Local fallback', localOnly: true },
    ],
  );

  assert.deepEqual(products.map((product) => product.id), ['remote-product', 'local-product']);
});

test('keeps explicit local fallback products when Supabase is empty', () => {
  const products = mergeProductsWithLocalOverrides([], [
    { id: 'seed-product', name: 'Seed product' },
    { id: 'local-product', name: 'Local fallback', localOnly: true },
  ]);

  assert.deepEqual(products.map((product) => product.id), ['local-product']);
});

test('compares configured admin credentials without plain string comparison', () => {
  assert.equal(secureEquals('owner', 'owner'), true);
  assert.equal(secureEquals('wrong', 'owner'), false);
});

test('uses configured credentials and issues a signed session', async (context) => {
  const previous = {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  };
  process.env.ADMIN_USERNAME = 'private-admin';
  process.env.ADMIN_PASSWORD = 'test-only-password';

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (previous.username === undefined) delete process.env.ADMIN_USERNAME;
    else process.env.ADMIN_USERNAME = previous.username;
    if (previous.password === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previous.password;
  });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'private-admin', password: 'test-only-password' }),
  });

  assert.equal(response.status, 200);
  const sessionCookies = response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';', 1)[0])
    .join('; ');
  assert.match(sessionCookies, /iphone-admin-session=/);
  assert.match(sessionCookies, /iphone-admin-session\.sig=/);

  const sessionResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/me`, {
    headers: { Cookie: sessionCookies },
  });
  assert.equal(sessionResponse.status, 200);
  assert.equal((await sessionResponse.json()).username, 'private-admin');

  const rejectedResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'private-admin', password: 'wrong-password' }),
  });
  assert.equal(rejectedResponse.status, 401);
});