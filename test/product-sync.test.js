const assert = require('node:assert/strict');
const test = require('node:test');
const app = require('../server');
const {
  isAllowedAdminEmail,
  mergeProductsWithLocalOverrides,
  verifyAdminCredentials,
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

test('only the configured Supabase admin email is allowlisted', () => {
  assert.equal(isAllowedAdminEmail('Owner@example.com', 'owner@example.com'), true);
  assert.equal(isAllowedAdminEmail('other@example.com', 'owner@example.com'), false);
  assert.equal(isAllowedAdminEmail('owner@example.com', ''), false);
});

test('verifies the password through Supabase Auth and rejects non-admin users', async () => {
  let receivedCredentials;
  const authClient = {
    auth: {
      signInWithPassword: async (credentials) => {
        receivedCredentials = credentials;
        return { data: { user: { email: credentials.email } }, error: null };
      },
    },
  };

  const user = await verifyAdminCredentials(
    authClient,
    'owner@example.com',
    'test-password',
    'owner@example.com',
  );
  const rejectedUser = await verifyAdminCredentials(
    authClient,
    'other@example.com',
    'test-password',
    'owner@example.com',
  );

  assert.deepEqual(receivedCredentials, { email: 'other@example.com', password: 'test-password' });
  assert.equal(user.email, 'owner@example.com');
  assert.equal(rejectedUser, null);
});