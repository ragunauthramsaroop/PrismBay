export const CATALOG_STATES = Object.freeze([
  'RESEARCH_CANDIDATE',
  'SUPPLIER_MATCHED',
  'COMMERCIAL_EVIDENCE_PENDING',
  'READY_FOR_FINAL_COMMERCIAL_GATE',
  'SALE_READY',
  'REJECTED'
]);

export const TRANSITIONS = Object.freeze({
  RESEARCH_CANDIDATE: ['SUPPLIER_MATCHED', 'REJECTED'],
  SUPPLIER_MATCHED: ['COMMERCIAL_EVIDENCE_PENDING', 'REJECTED'],
  COMMERCIAL_EVIDENCE_PENDING: ['READY_FOR_FINAL_COMMERCIAL_GATE', 'REJECTED'],
  READY_FOR_FINAL_COMMERCIAL_GATE: ['SALE_READY', 'COMMERCIAL_EVIDENCE_PENDING', 'REJECTED'],
  SALE_READY: ['COMMERCIAL_EVIDENCE_PENDING', 'REJECTED'],
  REJECTED: []
});

const GATES = Object.freeze({
  SUPPLIER_MATCHED: ['supplierIdentityVerified', 'exactVariantVerified'],
  COMMERCIAL_EVIDENCE_PENDING: ['supplierIdentityVerified', 'exactVariantVerified'],
  READY_FOR_FINAL_COMMERCIAL_GATE: [
    'supplierIdentityVerified',
    'exactVariantVerified',
    'variantStockVerified',
    'finalDestinationFreightVerified',
    'landedCostVerified',
    'marginFloorPassed',
    'mediaRightsVerified'
  ],
  SALE_READY: [
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
  ]
});

export function validateTransition(candidate = {}, nextState) {
  const current = candidate.status || 'RESEARCH_CANDIDATE';
  if (!CATALOG_STATES.includes(current)) return { ok: false, reason: 'invalid_current_state' };
  if (!CATALOG_STATES.includes(nextState)) return { ok: false, reason: 'invalid_next_state' };
  if (!(TRANSITIONS[current] || []).includes(nextState)) {
    return { ok: false, reason: `illegal_transition:${current}->${nextState}` };
  }
  if (nextState === 'REJECTED') return { ok: true, missing: [] };
  const missing = (GATES[nextState] || []).filter((gate) => candidate[gate] !== true);
  if (nextState === 'SALE_READY') {
    if (!candidate.checkoutUrl || !String(candidate.checkoutUrl).startsWith('https://')) missing.push('checkoutUrl');
    if (!(Number(candidate.priceUsd) > 0)) missing.push('priceUsd');
    if (!candidate.sku) missing.push('sku');
    if (!candidate.category) missing.push('category');
  }
  return { ok: missing.length === 0, missing: [...new Set(missing)], reason: missing.length ? 'gate_incomplete' : null };
}

export function advanceCandidate(candidate = {}, nextState, evidence = {}) {
  const check = validateTransition(candidate, nextState);
  if (!check.ok) throw new Error(`${check.reason}:${(check.missing || []).join(',')}`);
  return {
    ...candidate,
    status: nextState,
    lifecycle: {
      ...(candidate.lifecycle || {}),
      previousState: candidate.status || 'RESEARCH_CANDIDATE',
      transitionedAt: evidence.transitionedAt || new Date().toISOString(),
      correlationId: evidence.correlationId || candidate.lifecycle?.correlationId || null,
      evidenceRefs: Array.isArray(evidence.evidenceRefs) ? evidence.evidenceRefs : []
    }
  };
}

export function auditCatalogTransitions(rows = []) {
  const invalid = [];
  for (const row of rows) {
    if (!CATALOG_STATES.includes(row.status)) invalid.push({ sku: row.sku || null, reason: 'invalid_state' });
    if (row.status === 'SALE_READY') {
      const downgradeProbe = { ...row, status: 'READY_FOR_FINAL_COMMERCIAL_GATE' };
      const check = validateTransition(downgradeProbe, 'SALE_READY');
      if (!check.ok) invalid.push({ sku: row.sku || null, reason: 'sale_ready_gate_failure', missing: check.missing });
    }
  }
  return { ok: invalid.length === 0, invalid };
}
