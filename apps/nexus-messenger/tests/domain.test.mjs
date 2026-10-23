import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHomeserver, validateMessage, validateUserId, cleanError } from '../src/domain.mjs';

test('only HTTPS homeservers or localhost HTTP are allowed', () => {
  assert.equal(normalizeHomeserver(' https://example.org/// '), 'https://example.org');
  assert.equal(normalizeHomeserver('http://localhost:8008'), 'http://localhost:8008');
  assert.throws(() => normalizeHomeserver('http://example.org'), /HTTPS/);
  assert.throws(() => normalizeHomeserver('javascript:alert(1)'), /HTTPS/);
  assert.throws(() => normalizeHomeserver('https://alice:secret@example.org'), /credentials/);
  assert.throws(() => normalizeHomeserver('https://example.org/?token=secret'), /query/);
});

test('validates complete Matrix user IDs', () => {
  assert.equal(validateUserId('@randy:example.org'), true);
  assert.equal(validateUserId('randy'), false);
  assert.equal(validateUserId('@:example.org'), false);
  assert.equal(validateUserId('@john:'), false);
});

test('rejects empty and excessive message content', () => {
  assert.equal(validateMessage(' Hello '), 'Hello');
  assert.throws(() => validateMessage(' \n '), /Write a message/);
  assert.throws(() => validateMessage('x'.repeat(10001)), /limited/);
});

test('limits displayed errors', () => {
  assert.equal(cleanError(new Error('bad request')), 'bad request');
  assert.equal(cleanError(new Error('X'.repeat(1000))).length, 250);
});
