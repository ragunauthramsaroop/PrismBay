import crypto from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHECKOUT_PATTERN = /^cs_[A-Za-z0-9_]+$/;
const BOOLEAN_FIELDS = new Set(['transactionalAllowed', 'marketingConsent', 'deliveryVerified', 'suppressed']);

function parse32ByteSecret(value, name) {
  const secret = String(value || '').trim();
  let key = null;
  if (/^[A-Fa-f0-9]{64}$/.test(secret)) key = Buffer.from(secret, 'hex');
  else if (/^[A-Za-z0-9_-]{43}$/.test(secret)) key = Buffer.from(secret, 'base64url');
  if (!key || key.length !== 32) throw new Error(`${name}_must_encode_32_bytes`);
  return key;
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email || email.length > 320 || !EMAIL_PATTERN.test(email)) throw new Error('valid_customer_email_required');
  return email;
}

function safeCheckoutRef(value) {
  const ref = String(value || '').trim();
  if (!CHECKOUT_PATTERN.test(ref) || ref.length > 220) throw new Error('valid_checkout_ref_required');
  return ref;
}

function clone(value) {
  return structuredClone(value);
}

function deriveRecipientRef(email, key) {
  return `recipient_${crypto.createHmac('sha256', key).update(email).digest('base64url').slice(0, 32)}`;
}

function encryptEmail(email, recipientRef, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`prismbay-contact-v1:${recipientRef}`));
  const ciphertext = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url')
  };
}

function decryptEmail(record, recipientRef, key) {
  try {
    const iv = Buffer.from(String(record?.iv || ''), 'base64url');
    const ciphertext = Buffer.from(String(record?.ciphertext || ''), 'base64url');
    const tag = Buffer.from(String(record?.tag || ''), 'base64url');
    if (iv.length !== 12 || tag.length !== 16 || !ciphertext.length) throw new Error('invalid_encrypted_contact');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(`prismbay-contact-v1:${recipientRef}`));
    decipher.setAuthTag(tag);
    return normalizeEmail(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'));
  } catch {
    throw new Error('contact_vault_decryption_failed');
  }
}

function normalizeState(input) {
  if (!input || input.version !== 1 || !input.contacts || typeof input.contacts !== 'object' || Array.isArray(input.contacts)) {
    throw new Error('invalid_contact_vault');
  }
  return { version: 1, contacts: input.contacts };
}

export async function openContactVault({ directory, encryptionSecret, recipientRefSecret } = {}) {
  if (!directory) throw new Error('contact_vault_directory_required');
  const encryptionKey = parse32ByteSecret(encryptionSecret, 'AUTOMATION_CONTACT_VAULT_KEY');
  const refKey = parse32ByteSecret(recipientRefSecret, 'AUTOMATION_RECIPIENT_REF_KEY');
  const root = resolve(directory);
  const filePath = join(root, 'contacts.v1.json');
  await mkdir(root, { recursive: true, mode: 0o700 });

  let state = { version: 1, contacts: {} };
  try {
    state = normalizeState(JSON.parse(await readFile(filePath, 'utf8')));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  let tail = Promise.resolve();
  async function mutate(fn) {
    const operation = tail.then(async () => {
      const next = clone(state);
      const result = await fn(next);
      const temp = join(root, `contacts-${crypto.randomUUID()}.tmp`);
      await writeFile(temp, `${JSON.stringify(next)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      await rename(temp, filePath);
      state = next;
      return result;
    });
    tail = operation.catch(() => {});
    return operation;
  }

  return Object.freeze({
    filePath,
    recipientRefForEmail(value) {
      return deriveRecipientRef(normalizeEmail(value), refKey);
    },
    async capturePaidCheckout({ email, checkoutRef, now = new Date().toISOString() } = {}) {
      const normalizedEmail = normalizeEmail(email);
      const sourceCheckoutRef = safeCheckoutRef(checkoutRef);
      const recipientRef = deriveRecipientRef(normalizedEmail, refKey);
      const updatedAt = new Date(now).toISOString();
      if (updatedAt === 'Invalid Date') throw new Error('valid_capture_time_required');
      return mutate((next) => {
        const previous = next.contacts[recipientRef];
        next.contacts[recipientRef] = {
          emailCipher: encryptEmail(normalizedEmail, recipientRef, encryptionKey),
          transactionalAllowed: previous ? previous.transactionalAllowed === true : true,
          marketingConsent: previous ? previous.marketingConsent === true : false,
          deliveryVerified: previous ? previous.deliveryVerified === true : false,
          suppressed: previous ? previous.suppressed === true : false,
          sourceCheckoutRef,
          updatedAt
        };
        return { recipientRef, created: !previous };
      });
    },
    async updateEvidence(recipientRefValue, patch = {}, now = new Date().toISOString()) {
      const recipientRef = String(recipientRefValue || '').trim();
      if (!/^recipient_[A-Za-z0-9_-]{32}$/.test(recipientRef)) throw new Error('valid_recipient_ref_required');
      const updatedAt = new Date(now).toISOString();
      if (updatedAt === 'Invalid Date') throw new Error('valid_update_time_required');
      const unknown = Object.keys(patch).filter((key) => !BOOLEAN_FIELDS.has(key));
      if (unknown.length) throw new Error('unsupported_contact_evidence_field');
      for (const value of Object.values(patch)) if (typeof value !== 'boolean') throw new Error('contact_evidence_must_be_boolean');
      return mutate((next) => {
        const previous = next.contacts[recipientRef];
        if (!previous) throw new Error('recipient_not_found');
        next.contacts[recipientRef] = { ...previous, ...patch, updatedAt };
        return { recipientRef, updated: true };
      });
    },
    async resolveRecipient({ recipientRef: recipientRefValue } = {}) {
      await tail;
      const recipientRef = String(recipientRefValue || '').trim();
      const record = state.contacts[recipientRef];
      if (!record) return null;
      return {
        recipientRef,
        email: decryptEmail(record.emailCipher, recipientRef, encryptionKey),
        transactionalAllowed: record.transactionalAllowed === true,
        marketingConsent: record.marketingConsent === true,
        deliveryVerified: record.deliveryVerified === true,
        suppressed: record.suppressed === true
      };
    },
    async snapshot() {
      await tail;
      return clone(state);
    }
  });
}
