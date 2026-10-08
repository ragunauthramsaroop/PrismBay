import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { CHANNEL, BRAND, classify, fingerprint } from './youtube-publishing-guard.mjs';
import { guardedPublish, prepareStudio } from './youtube-publishing-gateway.mjs';

const sha = value => createHash('sha256').update(String(value)).digest('hex');
const youtubeOnly = candidate => candidate?.channelId === CHANNEL && candidate?.providers?.length === 1 && candidate.providers[0]?.network === 'youtube';

export const RESILIENCE_POLICY = Object.freeze({
  channelId: CHANNEL,
  metricoolBrandId: BRAND,
  paidSpendAllowed: false,
  automaticRetryAfterUncertainPublish: false,
  maxShortsPerDay: 2,
  minimumShortSpacingHours: 4
});

export function chooseProductionRoute({ descript = {}, heygen = {}, local = {} } = {}) {
  if (descript.available && !descript.busy && descript.freeCapacity !== false) return 'descript';
  if (heygen.available && heygen.callable && heygen.freeCapacity === true) return 'heygen-free';
  if (local.ffmpeg && local.openTts) return 'local-ffmpeg-open-tts';
  return 'research-and-script-only';
}

export function buildRoutePlan({ askStudio = false, exa = false, web = false, descript, heygen, local, metricool = false, studio = false } = {}) {
  return {
    channelId: CHANNEL,
    research: askStudio ? 'ask-studio' : exa ? 'exa' : web ? 'web' : 'offline-research-queue',
    production: chooseProductionRoute({ descript, heygen, local }),
    publishing: metricool ? 'metricool' : studio ? 'youtube-studio' : 'durable-private-queue',
    analytics: metricool ? 'metricool' : studio ? 'youtube-studio' : 'deferred',
    spend: 0
  };
}

async function deferCandidate({ candidate, stateDir, reason, now = Date.now }) {
  if (!stateDir) throw Error('Private state directory required');
  await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
  const key = sha(`${CHANNEL}|${fingerprint(candidate)}`);
  const deferredPath = path.join(stateDir, `${key}.deferred.json`);
  const record = {
    status: 'awaiting-authenticated-publisher',
    channelId: CHANNEL,
    metricoolBrandId: BRAND,
    contentFingerprint: fingerprint(candidate),
    title: candidate?.youtubeData?.title || '',
    mediaSha256: candidate?.mediaSha256 || candidate?.sha256 || candidate?.mediaHash || null,
    publicationDate: candidate?.publicationDate || null,
    reason,
    createdAt: new Date(now()).toISOString(),
    paidSpend: 0
  };
  try {
    await fs.writeFile(deferredPath, JSON.stringify(record), { flag: 'wx', mode: 0o600 });
    return { status: 'deferred', deferredPath, reason };
  } catch (error) {
    if (error.code === 'EEXIST') return { status: 'already-deferred', deferredPath, reason };
    throw error;
  }
}

function safeForAlternatePreflight(candidate) {
  if (!youtubeOnly(candidate)) return false;
  if (candidate.autoPublish !== true || candidate.draft !== false) return false;
  return classify(candidate).ok;
}

export async function publishWithResilience({
  candidate,
  metricoolAdapter,
  studioSnapshot,
  studioReceiptPath,
  browserStudioAvailable = false,
  stateDir,
  now = Date.now
}) {
  if (!safeForAlternatePreflight(candidate)) {
    return { status: 'blocked', issues: ['channel-editorial-or-approval-policy-failed'], channelId: CHANNEL };
  }

  if (metricoolAdapter) {
    try {
      const result = await guardedPublish({ candidate, adapter: metricoolAdapter, stateDir, now });
      if (result.status === 'verified') return { ...result, route: 'metricool' };
      if (result.status === 'uncertain-no-retry' || result.status === 'duplicate-or-uncertain-blocked') {
        return { ...result, route: 'metricool', fallbackSuppressed: true };
      }
      if (result.status === 'blocked' && !browserStudioAvailable) {
        return result;
      }
    } catch {
      // A thrown gateway error occurs before a downstream send. A verified Studio
      // preflight or durable queue is therefore safe. Uncertain sends are returned,
      // not thrown, by guardedPublish and are never retried here.
    }
  }

  if (browserStudioAvailable && studioSnapshot && studioReceiptPath) {
    const studio = await prepareStudio({ candidate, snapshot: studioSnapshot, receiptPath: studioReceiptPath, now });
    if (studio.status === 'approved') {
      return { ...studio, status: 'studio-preflight-approved', route: 'youtube-studio', published: false };
    }
    return { ...studio, route: 'youtube-studio' };
  }

  return deferCandidate({ candidate, stateDir, reason: 'authenticated-publishing-route-unavailable', now });
}

export async function readDeferredQueue(stateDir) {
  if (!stateDir) throw Error('Private state directory required');
  let names;
  try { names = await fs.readdir(stateDir); } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const records = [];
  for (const name of names.filter(name => name.endsWith('.deferred.json')).sort()) {
    try {
      const record = JSON.parse(await fs.readFile(path.join(stateDir, name), 'utf8'));
      if (record.channelId !== CHANNEL || String(record.metricoolBrandId) !== BRAND) continue;
      records.push({ ...record, file: name });
    } catch {
      records.push({ status: 'corrupt-deferred-record', file: name });
    }
  }
  return records;
}
