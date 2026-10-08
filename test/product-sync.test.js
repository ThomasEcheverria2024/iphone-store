const assert = require('node:assert/strict');
const test = require('node:test');
const app = require('../server');
const { mergeProductsWithLocalOverrides } = require('../server');

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

test('rejects public default credentials when private admin credentials are unset', async (context) => {
  const previousUsername = process.env.ADMIN_USERNAME;
  const previousPassword = process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (previousUsername === undefined) delete process.env.ADMIN_USERNAME;
    else process.env.ADMIN_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
  });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'visitor', password: 'incorrect-password' }),
  });

  assert.equal(response.status, 503);
});

test('accepts only configured private admin credentials', async (context) => {
  const previousUsername = process.env.ADMIN_USERNAME;
  const previousPassword = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_USERNAME = 'test-admin';
  process.env.ADMIN_PASSWORD = 'test-private-password';

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (previousUsername === undefined) delete process.env.ADMIN_USERNAME;
    else process.env.ADMIN_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
  });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-admin', password: 'test-private-password' }),
  });

  assert.equal(response.status, 200);
});