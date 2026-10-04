import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { evaluateSourcePath, validateSourceRegistry } from './oss-source-policy.mjs';

const registry = JSON.parse(await fs.readFile(new URL('../config/oss-commerce-sources.json', import.meta.url), 'utf8'));

test('registry is valid and fail-closed', () => {
  const result = validateSourceRegistry(registry);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(registry.policy.defaultDecision, 'REJECT');
});

test('unknown repository is rejected', () => {
  const result = evaluateSourcePath(registry, 'unknown/example', 'src/index.ts');
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'repository_not_allowlisted');
});

test('Medusa MIT core path can be ported', () => {
  const result = evaluateSourcePath(registry, 'medusajs/medusa', 'packages/core/index.ts');
  assert.equal(result.allowed, true);
  assert.equal(result.decision, 'PORT_PATTERN');
  assert.equal(result.license, 'MIT');
});

test('Medusa enterprise path is rejected', () => {
  const result = evaluateSourcePath(registry, 'medusajs/medusa', 'enterprise/rbac/index.ts');
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'path_forbidden');
});

test('PostHog ee path is rejected while open path is allowed', () => {
  const blocked = evaluateSourcePath(registry, 'PostHog/posthog', 'ee/billing/model.py');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'path_forbidden');

  const allowed = evaluateSourcePath(registry, 'PostHog/posthog', 'posthog/api/capture.py');
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.decision, 'PORT_PATTERN');
});

test('Meilisearch enterprise features are rejected', () => {
  const result = evaluateSourcePath(registry, 'meilisearch/meilisearch', 'enterprise/sharding/node.rs');
  assert.equal(result.allowed, false);
});

test('Remotion remains blocked pending license review', () => {
  const result = evaluateSourcePath(registry, 'remotion-dev/remotion', 'packages/core/index.ts');
  assert.equal(result.allowed, false);
  assert.equal(result.decision, 'REJECT_PENDING_LICENSE_REVIEW');
});

test('Stripe sample server path is allowed for pattern porting', () => {
  const result = evaluateSourcePath(registry, 'stripe-samples/checkout-one-time-payments', 'server/node/server.js');
  assert.equal(result.allowed, true);
  assert.equal(result.license, 'MIT');
});
