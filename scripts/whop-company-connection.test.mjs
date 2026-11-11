import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyWhopReadAccess } from './whop-company-connection.mjs';

const valid = {key: 'apik_FAKEKEY0123456789', companyId: 'biz_TESTCOMPANY01234'};
test('refuses a missing key before network access', async () => {
  let called = false;
  const result = await verifyWhopReadAccess({
    key: '', companyId: valid.companyId, fetchImpl: () => { called = true; },
  });
  assert.equal(result.ok, false);
  assert.equal(called, false);
});
test('rejects malformed company identifiers before network access', async () => {
  let called = false;
  const result = await verifyWhopReadAccess({
    ...valid, companyId: 'https://example.test', fetchImpl: () => { called = true; },
  });
  assert.equal(result.ok, false);
  assert.equal(called, false);
});
test('makes one authorized read-only request to exact Whop host', async () => {
  let calls = 0;
  const result = await verifyWhopReadAccess({
    ...valid,
    fetchImpl: async (url, options) => {
      calls++;
      const parsed = new URL(url);
      assert.equal(parsed.origin, 'https://api.whop.com');
      assert.equal(parsed.pathname, '/api/v1/plans');
      assert.equal(parsed.searchParams.get('company_id'), valid.companyId);
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.Authorization, 'Bearer ' + valid.key);
      assert.equal(options.headers['Api-Version-Date'], '2026-11-07');
      return {status: 200};
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.ok, true);
});
test('denied or expired keys never report success', async () => {
  for (const status of [401,403,404,429,500]) {
    const result = await verifyWhopReadAccess({
      ...valid, fetchImpl: async () => ({status}),
    });
    assert.equal(result.ok, false);
  }
});
test('network failure is sanitized without exposing key', async () => {
  const result = await verifyWhopReadAccess({
    ...valid,
    fetchImpl: async () => {throw new Error('SECRET:' + valid.key);},
  });
  assert.equal(result.ok, false);
  assert.ok(!JSON.stringify(result).includes(valid.key));
});
