import test from 'node:test';
import assert from 'node:assert/strict';
import { openRecipientEnvelope, sealRecipientEnvelope, validateRecipientEnvelopeSecret } from './automation-recipient-envelope.mjs';

const SECRET = '88'.repeat(32);
const JOB_ID = 'auto_recipient_envelope_001';
const LEASE_ID = 'lease_recipient_envelope_001';
const RECIPIENT_REF = `recipient_${'a'.repeat(32)}`;
const STATE = Object.freeze({
  recipientRef: RECIPIENT_REF,
  email: 'buyer@example.com',
  suppressed: false,
  transactionalAllowed: true,
  marketingConsent: false,
  deliveryVerified: true,
  productName: 'Crevice Brush',
  trackingUrl: 'https://carrier.example/track/PB1001',
  supportUrl: 'https://clean.prismbayai.com/contact.html',
  reviewUrl: null,
  storefrontUrl: 'https://clean.prismbayai.com/'
});

test('recipient state round-trips through a lease-bound AES-GCM envelope', () => {
  const envelope = sealRecipientEnvelope({ jobId: JOB_ID, leaseId: LEASE_ID, recipientState: STATE, secret: SECRET });
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.algorithm, 'A256GCM');
  assert.equal(JSON.stringify(envelope).includes('buyer@example.com'), false);
  assert.equal(JSON.stringify(envelope).includes('@'), false);
  const opened = openRecipientEnvelope({ jobId: JOB_ID, leaseId: LEASE_ID, envelope, secret: SECRET });
  assert.deepEqual(opened, STATE);
});

test('cross-job and cross-lease replay cannot decrypt a recipient envelope', () => {
  const envelope = sealRecipientEnvelope({ jobId: JOB_ID, leaseId: LEASE_ID, recipientState: STATE, secret: SECRET });
  assert.throws(
    () => openRecipientEnvelope({ jobId: 'auto_other_job', leaseId: LEASE_ID, envelope, secret: SECRET }),
    /recipient_envelope_decryption_failed/,
  );
  assert.throws(
    () => openRecipientEnvelope({ jobId: JOB_ID, leaseId: 'lease_other', envelope, secret: SECRET }),
    /recipient_envelope_decryption_failed/,
  );
});

test('tampered ciphertext or authentication tag fails closed', () => {
  const envelope = sealRecipientEnvelope({ jobId: JOB_ID, leaseId: LEASE_ID, recipientState: STATE, secret: SECRET });
  const tag = Buffer.from(envelope.tag, 'base64url');
  tag[0] ^= 1;
  assert.throws(
    () => openRecipientEnvelope({ jobId: JOB_ID, leaseId: LEASE_ID, envelope: { ...envelope, tag: tag.toString('base64url') }, secret: SECRET }),
    /recipient_envelope_decryption_failed/,
  );
});

test('worker envelope key must encode exactly 32 bytes', () => {
  assert.equal(validateRecipientEnvelopeSecret(SECRET), true);
  assert.throws(() => validateRecipientEnvelopeSecret('short'), /must_encode_32_bytes/);
});

test('unsafe recipient URLs are rejected before encryption', () => {
  assert.throws(
    () => sealRecipientEnvelope({
      jobId: JOB_ID,
      leaseId: LEASE_ID,
      recipientState: { ...STATE, trackingUrl: 'http://carrier.example/PB1001' },
      secret: SECRET
    }),
    /tracking_url_must_be_https/,
  );
});
