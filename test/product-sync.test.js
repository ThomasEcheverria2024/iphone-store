const assert = require('node:assert/strict');
const test = require('node:test');
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