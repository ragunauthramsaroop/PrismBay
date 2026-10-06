#!/usr/bin/env node

const API_BASE = 'https://zernio.com/api';
const ACCOUNT_ID = '6ac41ebe5450b4ad42dec37e';
const EXPECTED_USERNAME = 'prismbayclean';

const POSTS = [
  { postId: '6ac467d6be09390412e67910', label: '3-in-1 Crevice Cleaning Brush' },
  { postId: '6ac468b9be09390412e67b77', label: 'Portable Garment Steamer' },
  { postId: '6ac46904009d2c1f6944f3c1', label: '5-in-1 Electric Spin Scrubber' }
];

function fail(message) {
  throw new Error(message);
}

async function api(path, options = {}) {
  const key = process.env.ZERNIO_API_KEY;
  if (!key) fail('missing_ZERNIO_API_KEY');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(30000)
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 1000) }; }
  }
  return { response, body };
}

async function verifyAccount() {
  const { response, body } = await api('/v1/accounts');
  if (!response.ok) fail(`accounts_${response.status}`);
  const stack = [body];
  let found = null;
  while (stack.length) {
    const value = stack.pop();
    if (Array.isArray(value)) { stack.push(...value); continue; }
    if (!value || typeof value !== 'object') continue;
    const id = value._id ?? value.id ?? value.accountId;
    if (id === ACCOUNT_ID) { found = value; break; }
    stack.push(...Object.values(value));
  }
  if (!found) fail('configured_tiktok_account_not_found');
  if (String(found.platform || '').toLowerCase() !== 'tiktok') fail('configured_account_not_tiktok');
  if (found.username && String(found.username).toLowerCase() !== EXPECTED_USERNAME) fail('configured_username_mismatch');
}

async function unpublish(post) {
  const { response, body } = await api(`/v1/posts/${post.postId}/unpublish`, {
    method: 'POST',
    body: JSON.stringify({ platform: 'tiktok', accountId: ACCOUNT_ID })
  });
  if (!response.ok) fail(`unpublish_${post.postId}_${response.status}:${JSON.stringify(body).slice(0,500)}`);
  return { statusCode: response.status, body };
}

async function verifyCancelled(post) {
  const { response, body } = await api(`/v1/posts/${post.postId}`);
  if (!response.ok) fail(`verify_${post.postId}_${response.status}`);
  const targets = Array.isArray(body?.post?.platforms) ? body.post.platforms : Array.isArray(body?.platforms) ? body.platforms : [];
  const target = targets.find((row) => String(row?.platform || '').toLowerCase() === 'tiktok' && ((row?.accountId?._id ?? row?.accountId) === ACCOUNT_ID));
  if (target && !['cancelled','failed'].includes(String(target.status || '').toLowerCase())) {
    fail(`platform_not_removed_${post.postId}_${target.status}`);
  }
  return body;
}

async function deleteRecord(post) {
  const { response, body } = await api(`/v1/posts/${post.postId}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) fail(`delete_record_${post.postId}_${response.status}:${JSON.stringify(body).slice(0,500)}`);
  return { statusCode: response.status, body };
}

async function main() {
  if (process.env.CONFIRM_RESET !== 'DELETE_PRISMBAY_TIKTOK_POSTS') fail('reset_confirmation_missing');
  await verifyAccount();
  const receipt = { schemaVersion: 1, account: EXPECTED_USERNAME, accountId: ACCOUNT_ID, generatedAt: new Date().toISOString(), removed: [] };
  for (const post of POSTS) {
    const unpublishResult = await unpublish(post);
    const verified = await verifyCancelled(post);
    const deleteResult = await deleteRecord(post);
    receipt.removed.push({ postId: post.postId, label: post.label, unpublishStatus: unpublishResult.statusCode, verifiedStatus: verified?.post?.status ?? verified?.status ?? null, zernioDeleteStatus: deleteResult.statusCode });
  }
  console.log(JSON.stringify({ ok: true, removed: receipt.removed }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
