import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBootstrapProof, validBootstrapEnvelope, validZip } from './server.mjs';

test('accepts only five-digit US ZIP shape', () => {
  assert.equal(validZip('10001'), true);
  assert.equal(validZip(' 90210 '), true);
  assert.equal(validZip('A0001'), false);
  assert.equal(validZip('1000'), false);
  assert.equal(validZip('10001-1234'), false);
});

test('bootstrap proof binds credential and timestamp', () => {
  const apiKey = 'cj_test_key_long_enough_123456789';
  const timestamp = Date.UTC(2026, 9, 9, 18, 0, 0);
  const envelope = { apiKey, timestamp, proof: makeBootstrapProof(apiKey, timestamp) };
  assert.equal(validBootstrapEnvelope(envelope, timestamp + 1000), true);
  assert.equal(validBootstrapEnvelope({ ...envelope, apiKey: apiKey + 'x' }, timestamp + 1000), false);
  assert.equal(validBootstrapEnvelope(envelope, timestamp + 6 * 60 * 1000), false);
});
