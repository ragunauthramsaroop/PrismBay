// PrismBay original lifecycle evaluator inspired by Dittofeed journey concepts.
// Upstream: https://github.com/dittofeed/dittofeed (MIT).
// No Dittofeed source code is copied. This module never sends messages.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DAY_MS = 86_400_000;

export const JOURNEYS = Object.freeze({
  'post-purchase-onboarding': {
    eventField: 'purchasedAt',
    consentRequired: true,
    deliveryRequired: false,
    liveRunner: 'POST /api/admin/run-sequence',
    steps: [1, 3, 7, 12, 21].map((day) => ({ day, template: `post-purchase-day-${day}` }))
  },
  'pre-purchase-nurture': {
    eventField: 'subscribedAt',
    consentRequired: true,
    deliveryRequired: false,
    liveRunner: 'POST /api/admin/run-sequence',
    steps: [1, 4, 10].map((day) => ({ day, template: `pre-purchase-day-${day}` }))
  },
  'abandonment-recovery': {
    eventField: 'abandonedAt',
    consentRequired: true,
    deliveryRequired: false,
    liveRunner: null,
    steps: [{ day: 0, afterHours: 2, template: 'abandonment-2h' }, { day: 1, template: 'abandonment-day-1' }]
  },
  'review-request': {
    eventField: 'deliveredAt',
    consentRequired: true,
    deliveryRequired: true,
    liveRunner: null,
    steps: [{ day: 7, template: 'verified-review-day-7' }]
  }
});

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function recipientRef(email) {
  const normalized = normalizeEmail(email);
  return normalized ? hash(`lifecycle-recipient|${normalized}`).slice(0, 16) : null;
}

export function idempotencyKey(campaign, email, template) {
  const normalized = normalizeEmail(email);
  if (!campaign || !normalized || !template) throw new Error('idempotency_identity_required');
  return hash(`lifecycle-v1|${String(campaign)}|${normalized}|${String(template)}`);
}

export function buildSentSet(rows = []) {
  const set = new Set();
  for (const row of rows || []) {
    const campaign = row.campaign_name ?? row.campaign ?? row.journey;
    const email = row.recipient_email ?? row.email;
    const template = row.template_name ?? row.template;
    if (campaign && isValidEmail(email) && template) set.add(idempotencyKey(campaign, email, template));
  }
  return set;
}

export function buildSuppressionSet(input = {}) {
  const output = new Map();
  for (const reason of ['unsubscribed', 'bounced', 'complained']) {
    for (const email of input?.[reason] || []) {
      if (isValidEmail(email)) output.set(recipientRef(email), `suppressed_${reason}`);
    }
  }
  return output;
}

function parseTime(value) {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : null;
}

function stepTargetMs(eventMs, step) {
  if (Number.isFinite(Number(step.afterHours))) return eventMs + Number(step.afterHours) * 3_600_000;
  return eventMs + Number(step.day || 0) * DAY_MS;
}

export function evaluateStep({ journeyName, step, contact, nowMs = Date.now(), sentSet = new Set(), suppressions = new Map(), windowHours = 24 }) {
  const journey = JOURNEYS[journeyName];
  if (!journey) return { eligible: false, reason: 'unknown_journey' };
  if (!isValidEmail(contact?.email)) return { eligible: false, reason: 'invalid_email' };

  const ref = recipientRef(contact.email);
  if (suppressions.has(ref)) return { eligible: false, reason: suppressions.get(ref), recipientRef: ref };
  if (journey.consentRequired && contact.consent !== true) return { eligible: false, reason: 'missing_consent_evidence', recipientRef: ref };
  if (journey.deliveryRequired && !contact.deliveredAt) return { eligible: false, reason: 'missing_delivery_evidence', recipientRef: ref };

  const eventMs = parseTime(contact[journey.eventField]);
  if (eventMs === null) return { eligible: false, reason: 'missing_event_time', recipientRef: ref };

  const key = idempotencyKey(journeyName, contact.email, step.template);
  if (sentSet.has(key)) return { eligible: false, reason: 'duplicate_idempotency', recipientRef: ref, idempotencyKeyHash: key.slice(0, 16) };

  const targetMs = stepTargetMs(eventMs, step);
  const windowMs = Math.max(1, Number(windowHours) || 24) * 3_600_000;
  if (nowMs < targetMs || nowMs >= targetMs + windowMs) {
    return { eligible: false, reason: 'outside_window', recipientRef: ref, idempotencyKeyHash: key.slice(0, 16) };
  }

  return {
    eligible: true,
    reason: 'eligible_dry_run',
    recipientRef: ref,
    idempotencyKeyHash: key.slice(0, 16),
    entry: {
      journey: journeyName,
      template: step.template,
      recipientRef: ref,
      idempotencyKeyHash: key.slice(0, 16),
      scheduledFor: new Date(targetMs).toISOString(),
      liveSendAttempted: false
    }
  };
}

export function dryRun({ contactsByJourney = {}, sentLog = [], suppressions = {}, nowMs = Date.now(), windowHours = 24 } = {}) {
  const sentSet = buildSentSet(sentLog);
  const suppressionSet = buildSuppressionSet(suppressions);
  const journeys = [];
  let eligible = 0;
  let blocked = 0;

  for (const [journeyName, journey] of Object.entries(JOURNEYS)) {
    const contacts = Array.isArray(contactsByJourney[journeyName]) ? contactsByJourney[journeyName] : [];
    const results = [];
    for (const contact of contacts) {
      for (const step of journey.steps) {
        const result = evaluateStep({ journeyName, step, contact, nowMs, sentSet, suppressions: suppressionSet, windowHours });
        if (result.eligible) eligible += 1;
        else blocked += 1;
        results.push({ template: step.template, ...result });
      }
    }
    journeys.push({ name: journeyName, contactCount: contacts.length, results });
  }

  return {
    schemaVersion: 1,
    mode: 'dry-run',
    generatedAt: new Date(nowMs).toISOString(),
    liveSendAttempted: false,
    supplierOrderingAttempted: false,
    totals: { eligible, blocked },
    journeys,
    provenance: {
      upstream: 'https://github.com/dittofeed/dittofeed',
      license: 'MIT',
      adaptation: 'Original PrismBay lifecycle evaluator inspired by open-source journey concepts; no source copied'
    }
  };
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function main({ reportDir = 'growth-reports', nowMs = Date.now() } = {}) {
  const [contactsByJourney, sentLog, suppressions] = await Promise.all([
    readJson(path.join(reportDir, 'lifecycle-journey-contacts.json'), {}),
    readJson(path.join(reportDir, 'lifecycle-journey-sentlog.json'), []),
    readJson(path.join(reportDir, 'lifecycle-journey-suppressions.json'), {})
  ]);
  const report = dryRun({ contactsByJourney, sentLog, suppressions, nowMs });
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(path.join(reportDir, 'lifecycle-journey-dryrun.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ mode: report.mode, eligible: report.totals.eligible, blocked: report.totals.blocked, liveSendAttempted: false }) + '\n');
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
