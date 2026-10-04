import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { openContactVault } from './contact-vault.mjs';

const ENC_KEY = '11'.repeat(32);
const REF_KEY = '22'.repeat(32);
const OTHER_ENC_KEY = '33'.repeat(32);

async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'prismbay-contact-vault-'));
  t.after(async () => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('paid checkout contact is encrypted at rest and resolves by de-identified reference', async (t) => {
  const directory = await tempDir(t);
  const vault = await openContactVault({ directory, encryptionSecret: ENC_KEY, recipientRefSecret: REF_KEY });
  const captured = await vault.capturePaidCheckout({
    email: 'Buyer+One@Example.com',
    checkoutRef: 'cs_test_123',
    now: '2026-10-04T04:00:00.000Z'
  });
  assert.match(captured.recipientRef, /^recipient_[A-Za-z0-9_-]{32}$/);
  const persisted = await readFile(vault.filePath, 'utf8');
  assert.equal(persisted.includes('buyer+one@example.com'), false);
  assert.equal(persisted.includes('Buyer+One@Example.com'), false);
  const resolved = await vault.resolveRecipient({ recipientRef: captured.recipientRef });
  assert.deepEqual(resolved, {
    recipientRef: captured.recipientRef,
    email: 'buyer+one@example.com',
    transactionalAllowed: true,
    marketingConsent: false,
    deliveryVerified: false,
    suppressed: false
  });
});

test('recipient reference is stable for normalized email with a stable HMAC key', async (t) => {
  const directory = await tempDir(t);
  const vault = await openContactVault({ directory, encryptionSecret: ENC_KEY, recipientRefSecret: REF_KEY });
  const first = vault.recipientRefForEmail('Buyer@Example.com');
  const second = vault.recipientRefForEmail(' buyer@example.com ');
  assert.equal(first, second);
});

test('repeat capture preserves explicit suppression, consent and delivery evidence', async (t) => {
  const directory = await tempDir(t);
  const vault = await openContactVault({ directory, encryptionSecret: ENC_KEY, recipientRefSecret: REF_KEY });
  const first = await vault.capturePaidCheckout({ email: 'buyer@example.com', checkoutRef: 'cs_test_123' });
  await vault.updateEvidence(first.recipientRef, {
    transactionalAllowed: false,
    marketingConsent: true,
    deliveryVerified: true,
    suppressed: true
  });
  await vault.capturePaidCheckout({ email: 'buyer@example.com', checkoutRef: 'cs_test_456' });
  const resolved = await vault.resolveRecipient({ recipientRef: first.recipientRef });
  assert.equal(resolved.transactionalAllowed, false);
  assert.equal(resolved.marketingConsent, true);
  assert.equal(resolved.deliveryVerified, true);
  assert.equal(resolved.suppressed, true);
});

test('wrong encryption key cannot decrypt an existing vault record', async (t) => {
  const directory = await tempDir(t);
  const original = await openContactVault({ directory, encryptionSecret: ENC_KEY, recipientRefSecret: REF_KEY });
  const captured = await original.capturePaidCheckout({ email: 'buyer@example.com', checkoutRef: 'cs_test_123' });
  const wrong = await openContactVault({ directory, encryptionSecret: OTHER_ENC_KEY, recipientRefSecret: REF_KEY });
  await assert.rejects(() => wrong.resolveRecipient({ recipientRef: captured.recipientRef }), /contact_vault_decryption_failed/);
});

test('invalid secrets and unsupported evidence fail closed', async (t) => {
  const directory = await tempDir(t);
  await assert.rejects(() => openContactVault({ directory, encryptionSecret: 'short', recipientRefSecret: REF_KEY }), /must_encode_32_bytes/);
  const vault = await openContactVault({ directory, encryptionSecret: ENC_KEY, recipientRefSecret: REF_KEY });
  const captured = await vault.capturePaidCheckout({ email: 'buyer@example.com', checkoutRef: 'cs_test_123' });
  await assert.rejects(() => vault.updateEvidence(captured.recipientRef, { email: true }), /unsupported_contact_evidence_field/);
});
