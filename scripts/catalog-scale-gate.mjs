import fs from 'node:fs/promises';

export const SALE_READY_GATES = Object.freeze([
  'demandEvidenceVerified',
  'supplierIdentityVerified',
  'exactVariantVerified',
  'variantStockVerified',
  'finalDestinationFreightVerified',
  'landedCostVerified',
  'marginFloorPassed',
  'mediaRightsVerified',
  'checkoutInfrastructureVerified',
  'fulfillmentReady'
]);

export const VALID_STATUSES = new Set([
  'RESEARCH_CANDIDATE',
  'SUPPLIER_MATCHED',
  'COMMERCIAL_EVIDENCE_PENDING',
  'READY_FOR_FINAL_COMMERCIAL_GATE',
  'SALE_READY',
  'REJECTED'
]);

function hasDemandEvidence(candidate = {}) {
  const e = candidate.demandEvidence;
  return Boolean(
    e &&
    typeof e.source === 'string' && e.source.trim() &&
    typeof e.observedAt === 'string' && e.observedAt.trim() &&
    typeof e.evidenceType === 'string' && e.evidenceType.trim() &&
    typeof e.confidence === 'string' && e.confidence.trim()
  );
}

export function missingSaleReadyGates(candidate = {}) {
  const missing = SALE_READY_GATES.filter((gate) => candidate[gate] !== true);
  if (!hasDemandEvidence(candidate)) missing.unshift('demandEvidence');
  if (!candidate.sku || typeof candidate.sku !== 'string') missing.unshift('sku');
  if (!candidate.category || typeof candidate.category !== 'string') missing.unshift('category');
  if (!candidate.checkoutUrl || typeof candidate.checkoutUrl !== 'string') missing.push('checkoutUrl');
  if (!(Number(candidate.priceUsd) > 0)) missing.push('priceUsd');
  return [...new Set(missing)];
}

export function deriveCatalogStatus(candidate = {}) {
  if (candidate.rejected === true) return 'REJECTED';
  const missing = missingSaleReadyGates(candidate);
  if (missing.length === 0) return 'SALE_READY';
  if (candidate.supplierIdentityVerified !== true) return 'RESEARCH_CANDIDATE';
  if (candidate.exactVariantVerified !== true) return 'SUPPLIER_MATCHED';
  if (
    candidate.variantStockVerified === true &&
    candidate.finalDestinationFreightVerified === true &&
    candidate.landedCostVerified === true &&
    candidate.marginFloorPassed === true &&
    candidate.mediaRightsVerified === true
  ) return 'READY_FOR_FINAL_COMMERCIAL_GATE';
  return 'COMMERCIAL_EVIDENCE_PENDING';
}

export function validatePublishableCandidate(candidate = {}) {
  const derivedStatus = deriveCatalogStatus(candidate);
  const declaredStatus = candidate.status || derivedStatus;
  if (!VALID_STATUSES.has(declaredStatus)) {
    return { ok: false, status: 'REJECTED', reasons: ['invalid_status'] };
  }
  const missing = missingSaleReadyGates(candidate);
  if (declaredStatus === 'SALE_READY' && missing.length > 0) {
    return { ok: false, status: derivedStatus, reasons: missing.map((x) => `missing:${x}`) };
  }
  return {
    ok: declaredStatus === 'SALE_READY' && missing.length === 0,
    status: derivedStatus,
    reasons: missing.map((x) => `missing:${x}`)
  };
}

export function summarizeCatalog(candidates = [], config = {}) {
  const categoryCounts = new Map();
  const statusCounts = new Map();
  const duplicateSkus = new Set();
  const seenSkus = new Set();

  for (const candidate of candidates) {
    const status = deriveCatalogStatus(candidate);
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    const category = candidate.category || 'uncategorized';
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    if (candidate.sku) {
      if (seenSkus.has(candidate.sku)) duplicateSkus.add(candidate.sku);
      seenSkus.add(candidate.sku);
    }
  }

  const total = candidates.length;
  const saleReady = statusCounts.get('SALE_READY') || 0;
  const maxShare = Number(config.maximumCategoryShare ?? 0.15);
  const overConcentratedCategories = total === 0 ? [] : [...categoryCounts.entries()]
    .filter(([, count]) => count / total > maxShare)
    .map(([category, count]) => ({ category, count, share: count / total }));

  return {
    total,
    researchPoolTarget: Number(config.researchPoolTarget ?? 600),
    saleReady,
    liveSaleReadyTarget: Number(config.liveSaleReadyTarget ?? 500),
    researchPoolGap: Math.max(0, Number(config.researchPoolTarget ?? 600) - total),
    saleReadyGap: Math.max(0, Number(config.liveSaleReadyTarget ?? 500) - saleReady),
    duplicateSkus: [...duplicateSkus],
    overConcentratedCategories,
    categoryCounts: Object.fromEntries(categoryCounts),
    statusCounts: Object.fromEntries(statusCounts)
  };
}

export async function main(candidatePath, configPath = 'config/catalog-scale-500.json') {
  if (!candidatePath) throw new Error('candidate_path_required');
  const [candidatesRaw, configRaw] = await Promise.all([
    fs.readFile(candidatePath, 'utf8'),
    fs.readFile(configPath, 'utf8')
  ]);
  const candidates = JSON.parse(candidatesRaw);
  const config = JSON.parse(configRaw);
  if (!Array.isArray(candidates)) throw new Error('candidate_dataset_must_be_array');
  const summary = summarizeCatalog(candidates, config);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main(process.argv[2], process.argv[3]);
}
