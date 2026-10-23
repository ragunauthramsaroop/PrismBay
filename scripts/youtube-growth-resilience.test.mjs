import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { CHANNEL } from './youtube-publishing-guard.mjs';
import { buildRoutePlan, chooseProductionRoute, publishWithResilience, readDeferredQueue } from './youtube-growth-resilience.mjs';

const NOW = Date.parse('2026-10-08T00:20:00-04:00');
const brand = { id: 6945443, networksData: { youtubeData: CHANNEL } };
const make = (title = 'AI agent approval gates for operators') => ({
  id: title,
  uuid: title,
  channelId: CHANNEL,
  text: `Practical AI business system: ${title}`,
  providers: [{ network: 'youtube', status: 'PENDING' }],
  media: [`https://example.com/${title.replace(/\W/g, '')}.mp4`],
  youtubeData: { title, tags: ['AI business'], type: 'short', madeForKids: false },
  publicationDate: { dateTime: '2026-10-08T16:00:00', timezone: 'America/Guyana' },
  autoPublish: true,
  draft: false
});

const freshSnapshot = candidate => ({
  brandSettings: brand,
  fetchedAt: new Date(NOW).toISOString(),
  queue: [],
  published: [],
  candidate
});

test('production routing stays zero-cost and falls through without stalling upstream work', () => {
  assert.equal(chooseProductionRoute({ descript: { available: true, busy: false, freeCapacity: true } }), 'descript');
  assert.equal(chooseProductionRoute({ descript: { available: true, busy: true }, heygen: { available: true, callable: true, freeCapacity: true } }), 'heygen-free');
  assert.equal(chooseProductionRoute({ descript: { available: false }, heygen: { available: true, callable: true, freeCapacity: false }, local: { ffmpeg: true, openTts: true } }), 'local-ffmpeg-open-tts');
  assert.equal(chooseProductionRoute({}), 'research-and-script-only');
  const plan = buildRoutePlan({ web: true, local: { ffmpeg: true, openTts: true } });
  assert.equal(plan.research, 'web');
  assert.equal(plan.publishing, 'durable-private-queue');
  assert.equal(plan.spend, 0);
});

test('wrong channel never falls through to an alternate publisher', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pb-resilience-wrong-'));
  const candidate = { ...make(), channelId: 'other-channel' };
  const result = await publishWithResilience({ candidate, stateDir: dir, now: () => NOW });
  assert.equal(result.status, 'blocked');
  assert.deepEqual(await readDeferredQueue(dir), []);
  await fs.rm(dir, { recursive: true, force: true });
});

test('missing authenticated publisher defers once instead of stopping production or duplicating', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pb-resilience-defer-'));
  const candidate = make('AI workflow ROI before procurement');
  const one = await publishWithResilience({ candidate, stateDir: dir, now: () => NOW });
  const two = await publishWithResilience({ candidate, stateDir: dir, now: () => NOW });
  assert.equal(one.status, 'deferred');
  assert.equal(two.status, 'already-deferred');
  const queue = await readDeferredQueue(dir);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].channelId, CHANNEL);
  assert.equal(queue[0].paidSpend, 0);
  await fs.rm(dir, { recursive: true, force: true });
});

test('pre-send Metricool failure can move to verified Studio preflight', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pb-resilience-studio-'));
  const media = path.join(dir, 'video.mp4');
  await fs.writeFile(media, 'original-video-bytes');
  const mediaSha256 = createHash('sha256').update('original-video-bytes').digest('hex');
  const candidate = { ...make('AI agent control points for finance'), localMediaPath: media, mediaSha256 };
  const brokenBeforeSend = {
    readBrand: async () => { throw Error('connector unavailable'); },
    readQueue: async () => { throw Error('not reached'); },
    readPublished: async () => ({ posts: [], fetchedAt: new Date(NOW).toISOString() }),
    send: async () => { throw Error('must not send'); },
    readBack: async () => null
  };
  const result = await publishWithResilience({
    candidate,
    metricoolAdapter: brokenBeforeSend,
    studioSnapshot: freshSnapshot(candidate),
    studioReceiptPath: path.join(dir, 'studio-receipt.json'),
    browserStudioAvailable: true,
    stateDir: dir,
    now: () => NOW
  });
  assert.equal(result.status, 'studio-preflight-approved');
  assert.equal(result.published, false);
  await fs.rm(dir, { recursive: true, force: true });
});

test('uncertain downstream publish suppresses every fallback and retry', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pb-resilience-uncertain-'));
  let sends = 0;
  const candidate = make('AI procurement approvals with human review');
  const adapter = {
    readBrand: async () => brand,
    readQueue: async () => ({ posts: [], fetchedAt: new Date(NOW).toISOString() }),
    readPublished: async () => ({ posts: [], fetchedAt: new Date(NOW).toISOString() }),
    send: async () => { sends += 1; throw Error('timeout after request'); },
    readBack: async () => null
  };
  const result = await publishWithResilience({ candidate, metricoolAdapter: adapter, browserStudioAvailable: true, studioSnapshot: freshSnapshot(candidate), studioReceiptPath: path.join(dir, 'receipt.json'), stateDir: dir, now: () => NOW });
  assert.equal(result.status, 'uncertain-no-retry');
  assert.equal(result.fallbackSuppressed, true);
  assert.equal(sends, 1);
  await fs.rm(dir, { recursive: true, force: true });
});
