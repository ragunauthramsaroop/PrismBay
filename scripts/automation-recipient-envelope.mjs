import crypto from 'node:crypto';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_PATTERN = /^[A-Za-z0-9._:/-]+$/;
const RECIPIENT_REF_PATTERN = /^recipient_[A-Za-z0-9_-]{32}$/;

function parse32ByteSecret(value) {
  const secret = String(value || '').trim();
  let key = null;
  if (/^[A-Fa-f0-9]{64}$/.test(secret)) key = Buffer.from(secret, 'hex');
  else if (/^[A-Za-z0-9_-]{43}$/.test(secret)) key = Buffer.from(secret, 'base64url');
  if (!key || key.length !== 32) throw new Error('AUTOMATION_WORKER_ENVELOPE_KEY_must_encode_32_bytes');
  return key;
}

function safeToken(value, name, max = 220) {
  const text = String(value || '').trim();
  if (!text || text.length > max || !TOKEN_PATTERN.test(text)) throw new Error(`${name}_required`);
  return text;
}

function optionalHttpsUrl(value, name) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('invalid');
    return url.toString();
  } catch {
    throw new Error(`${name}_must_be_https`);
  }
}

function normalizedRecipientState(input = {}) {
  const recipientRef = String(input.recipientRef || '').trim();
  if (!RECIPIENT_REF_PATTERN.test(recipientRef)) throw new Error('valid_recipient_ref_required');
  const email = String(input.email || '').trim().toLowerCase();
  if (!email || email.length > 320 || !EMAIL_PATTERN.test(email)) throw new Error('valid_recipient_email_required');
  for (const field of ['suppressed', 'transactionalAllowed', 'marketingConsent', 'deliveryVerified']) {
    if (typeof input[field] !== 'boolean') throw new Error(`${field}_boolean_required`);
  }
  const productName = input.productName == null ? null : String(input.productName).trim().slice(0, 200) || null;
  return {
    recipientRef,
    email,
    suppressed: input.suppressed,
    transactionalAllowed: input.transactionalAllowed,
    marketingConsent: input.marketingConsent,
    deliveryVerified: input.deliveryVerified,
    productName,
    trackingUrl: optionalHttpsUrl(input.trackingUrl, 'tracking_url'),
    supportUrl: optionalHttpsUrl(input.supportUrl, 'support_url'),
    reviewUrl: optionalHttpsUrl(input.reviewUrl, 'review_url'),
    storefrontUrl: optionalHttpsUrl(input.storefrontUrl, 'storefront_url')
  };
}

function aad(jobId, leaseId) {
  return Buffer.from(`prismbay-worker-recipient-v1|${jobId}|${leaseId}`);
}

export function sealRecipientEnvelope({ jobId, leaseId, recipientState, secret } = {}) {
  const safeJobId = safeToken(jobId, 'job_id');
  const safeLeaseId = safeToken(leaseId, 'lease_id', 160);
  const key = parse32ByteSecret(secret);
  const state = normalizedRecipientState(recipientState);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad(safeJobId, safeLeaseId));
  const plaintext = Buffer.from(JSON.stringify({ schemaVersion: 1, recipientState: state }), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    schemaVersion: 1,
    algorithm: 'A256GCM',
    iv: iv.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url')
  };
}

export function openRecipientEnvelope({ jobId, leaseId, envelope, secret } = {}) {
  const safeJobId = safeToken(jobId, 'job_id');
  const safeLeaseId = safeToken(leaseId, 'lease_id', 160);
  const key = parse32ByteSecret(secret);
  try {
    if (envelope?.schemaVersion !== 1 || envelope?.algorithm !== 'A256GCM') throw new Error('invalid_envelope');
    const iv = Buffer.from(String(envelope.iv || ''), 'base64url');
    const ciphertext = Buffer.from(String(envelope.ciphertext || ''), 'base64url');
    const tag = Buffer.from(String(envelope.tag || ''), 'base64url');
    if (iv.length !== 12 || tag.length !== 16 || !ciphertext.length) throw new Error('invalid_envelope');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(aad(safeJobId, safeLeaseId));
    decipher.setAuthTag(tag);
    const decoded = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'));
    if (decoded?.schemaVersion !== 1) throw new Error('invalid_envelope');
    return normalizedRecipientState(decoded.recipientState);
  } catch (error) {
    if (String(error?.message || '').endsWith('_required') || String(error?.message || '').endsWith('_must_be_https')) throw error;
    throw new Error('recipient_envelope_decryption_failed');
  }
}
