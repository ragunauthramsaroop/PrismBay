const MAX_MESSAGE_LENGTH = 10000;

/** Only HTTPS public homeservers, or local HTTP during development, are allowed. */
export function normalizeHomeserver(input) {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new Error('Enter a homeserver URL.');
  }
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('Enter a full homeserver URL, starting with https://.');
  }
  const host = url.hostname.toLowerCase();
  const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new Error('Use HTTPS, except for a localhost development server.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The homeserver URL must not include credentials, query parameters, or fragments.');
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

/** Matrix user IDs use the @localpart:server format. */
export function validateUserId(value) {
  return typeof value === 'string' && /^@[^\s:@]+:[^\s:]+(?::\d+)?$/.test(value.trim());
}

export function validateMessage(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Write a message first.');
  }
  if (value.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Messages are limited to ${MAX_MESSAGE_LENGTH.toLocaleString()} characters in this client.`);
  }
  return value.trim();
}

export function cleanError(error) {
  const message = error instanceof Error ? error.message : 'Something went wrong. Please retry.';
  return message.slice(0, 250);
}
