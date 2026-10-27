import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { matchesIntendedProduct } from './cj-match-policy.mjs';

const illustrativeScopes = new Set(['example_zip_estimate','tip_example_zip_estimate']);

function normalizeFreight(row) {
  const scope = row?.freightQuoteScope || null;
  const estimated = Boolean(row?.freightEstimateVerified ?? row?.countryFreightEstimated);
  return {
    ...row,
    freightEstimateVerified: estimated,
    countryFreightEstimated: Boolean(estimated && (!scope || scope === 'country_estimate')),
    illustrativeZipFreightEstimated: Boolean(estimated && illustrativeScopes.has(scope)),
  };
}

function authorizationFor(authorization, slug, finalZipFreightVerified, supplierGatesVerified = false) {
  const ownerAuthorized = authorization?.ownerAuthorized === true;
  const originalMedia = ownerAuthorized &&
    authorization?.media?.promotionMediaRightsVerified === true &&
    authorization?.media?.policy === 'original_graphics_and_original_copy_only' &&
    authorization?.media?.supplierMediaAuthorized !== true &&
    authorization?.media?.thirdPartyMediaAuthorized !== true;
  const promotionPolicyAuthorized = ownerAuthorized &&
    authorization?.promotion?.automaticPromotionAllowedAfterAllOtherGates === true &&
    authorization?.paidSpendAuthorized !== true &&
    authorization?.bulkOutreachAuthorized !== true;
  const checkoutSkus = new Set(Array.isArray(authorization?.checkoutInfrastructure?.verifiedCheckoutSkus)
    ? authorization.checkoutInfrastructure.verifiedCheckoutSkus.map(String)
    : []);
  const checkoutInfrastructureVerified = ownerAuthorized &&
    authorization?.checkoutInfrastructure?.deployed === true &&
    authorization?.checkoutInfrastructure?.stripeWebhookSecretConfigured === true &&
    checkoutSkus.has(String(slug || ''));
  const checkoutAllowed = checkoutInfrastructureVerified && finalZipFreightVerified === true;
  return {
    mediaRightsVerified: originalMedia,
    promotionMediaPolicy: originalMedia ? 'original_graphics_and_original_copy_only' : null,
    checkoutInfrastructureVerified,
    checkoutAllowed,
    // Owner policy approval is not product-specific clearance. Do not expose a
    // publishable flag before supplier, ZIP freight, checkout and fulfillment pass.
    promotionPolicyAuthorized,
    automaticPromotionAllowed: promotionPolicyAuthorized && supplierGatesVerified && originalMedia && checkoutAllowed,
  };
}

function isSaleReady(candidate = {}) {
  return candidate.independentIdentityMatch === true &&
    candidate.variantStockVerified === true &&
    candidate.freightEstimateVerified === true &&
    candidate.finalZipFreightVerified === true &&
    candidate.mediaRightsVerified === true &&
    candidate.checkoutAllowed === true &&
    candidate.fulfillmentRouteVerified === true &&
    candidate.automaticPromotionAllowed === true;
}

// Sanitized read-only handoff. A matched product never implies sale readiness.
export function buildCJReview(report, authorization = null) {
  if (!report || !Array.isArray(report.results) || !Number.isFinite(Date.parse(report.checkedAt))) {
    throw new Error('CJ verification report missing or invalid');
  }
  const authenticationVerified = report.authentication === 'verified';
  const candidates = report.results.map(row => {
    const intended = String(row.candidate || '');
    const productName = String(row.product?.name || '');
    const slug = typeof row.slug === 'string' ? row.slug : null;
    const identity = slug ? matchesIntendedProduct({slug}, productName) : null;
    const freightScope = row.freightQuoteScope || null;
    const verifiedIdentity = authenticationVerified ? identity : null;
    const variantStockVerified = Boolean(authenticationVerified && identity === true && row.variantInventoryVerified);
    const freightEstimateVerified = Boolean(variantStockVerified && row.freightVerified);
    // A country estimate or illustrative ZIP is never the buyer's final freight.
    // The verified flag must be paired with an explicit buyer-destination scope.
    const finalZipFreightVerified = Boolean(freightEstimateVerified &&
      freightScope === 'buyer_destination_zip' && row.finalZipFreightVerified === true);
    // An authenticated CJ lookup does not establish fulfillment approval.
    // Require an explicit verified route before promotion or sale readiness.
    const fulfillmentRouteVerified = authenticationVerified && row.fulfillmentRouteVerified === true;
    const supplierGatesVerified = authenticationVerified && row.supplierVerified === true &&
      identity === true && variantStockVerified && freightEstimateVerified &&
      finalZipFreightVerified && fulfillmentRouteVerified;
    const commercial = authorizationFor(authorization, slug, finalZipFreightVerified, supplierGatesVerified);
    let status = 'supplier_search_needed';
    if (!authenticationVerified) {
      status = 'supplier_authentication_required';
    } else if (row.supplierVerified) {
      status = identity === false ? 'identity_rejected' :
        identity === null ? 'manual_identity_check_required' :
        !row.variantInventoryVerified ? 'variant_stock_required' :
        !row.freightVerified ? 'destination_freight_required' :
        !finalZipFreightVerified ? 'final_zip_freight_required' :
        !commercial.checkoutAllowed ? 'checkout_review_required' :
        !fulfillmentRouteVerified ? 'fulfillment_route_required' :
        !commercial.automaticPromotionAllowed ? 'promotion_approval_required' :
        'commercial_review_required';
    } else if (row.status === 'search_error') {
      status = 'supplier_api_retry_required';
    }
    const candidate = {
      slug, candidate: intended, observedProduct: productName || null,
      liveStoreProduct: Boolean(row.liveStoreProduct),
      retailPriceUsd: Number.isFinite(Number(row.retailPriceUsd)) ? Number(row.retailPriceUsd) : null,
      // Public CJ catalog identifiers only, never credentials, account IDs or customer data.
      observedSupplierSku: typeof row.product?.sku === 'string' ? row.product.sku : null,
      observedVariantSku: typeof row.product?.variantSku === 'string' ? row.product.variantSku : null,
      freightDiagnostic: typeof row.freightDiagnostic === 'string' ? row.freightDiagnostic :
        (Number(row.zeroPriceQuoteCount) > 0 ? 'zero_priced_methods_require_supplier_confirmation' : null),
      freightQuoteScope: freightScope,
      zeroPricedMethodCount: Number.isInteger(row.zeroPriceQuoteCount) ? row.zeroPriceQuoteCount : 0,
      supplierClaimedMatch: Boolean(row.supplierVerified),
      independentIdentityMatch: verifiedIdentity, status,
      variantStockVerified,
      freightEstimateVerified,
      countryFreightEstimated: Boolean(freightEstimateVerified && freightScope === 'country_estimate'),
      illustrativeZipFreightEstimated: Boolean(freightEstimateVerified && illustrativeScopes.has(freightScope)),
      finalZipFreightVerified,
      fulfillmentRouteVerified,
      ...commercial,
    };
    return candidate;
  });
  return {
    schemaVersion: 3, checkedAt: report.checkedAt, market: report.market || 'US',
    authenticationVerified, sourceCandidateCount: report.results.length,
    liveStoreCandidateCount: candidates.filter(c => c.liveStoreProduct).length,
    independentProductMatches: candidates.filter(c => c.independentIdentityMatch === true).length,
    rejectedFalseMatches: candidates.filter(c => c.status === 'identity_rejected').length,
    verifiedVariantCount: candidates.filter(c => c.variantStockVerified).length,
    freightEstimateCount: candidates.filter(c => c.freightEstimateVerified).length,
    countryFreightEstimateCount: candidates.filter(c => c.countryFreightEstimated).length,
    illustrativeZipFreightEstimateCount: candidates.filter(c => c.illustrativeZipFreightEstimated).length,
    finalZipFreightCount: candidates.filter(c => c.finalZipFreightVerified).length,
    mediaRightsVerifiedCount: candidates.filter(c => c.mediaRightsVerified).length,
    checkoutInfrastructureVerifiedCount: candidates.filter(c => c.checkoutInfrastructureVerified).length,
    promotionAuthorizedCount: candidates.filter(c => c.automaticPromotionAllowed).length,
    saleReadyCount: candidates.filter(isSaleReady).length,
    zeroPricedCandidateCount: candidates.filter(c => c.zeroPricedMethodCount > 0).length,
    allRequireManualCommercialApproval: true,
    ownerCommercialAuthorizationLoaded: authorization?.ownerAuthorized === true,
    note: 'Country and illustrative ZIP freight estimates are not final buyer ZIP approval. Checkout remains blocked until exact destination freight is verified. Promotion media is restricted to original graphics and original copy unless separate rights evidence exists.',
    candidates,
  };
}

// Carry forward distinct batches for up to thirty hours so scheduled checks
// form a rolling supplier review rather than overwriting each other.
export function mergeCJReview(previous, fresh) {
  const current = fresh.candidates.map(c => ({...c, observedAt: fresh.checkedAt}));
  const now = Date.parse(fresh.checkedAt);
  const seen = new Set(current.map(c => c.slug).filter(Boolean));
  const retained = Array.isArray(previous?.candidates) ? previous.candidates.filter(c => {
    const observedAt = Date.parse(c.observedAt || previous?.checkedAt);
    return Boolean(c.slug) && !seen.has(c.slug) && Number.isFinite(observedAt) &&
      observedAt <= now && now - observedAt < 30 * 36e5;
  }).map(c => ({
    ...c,
    // Historical observations support research continuity, not current commercial consent.
    // Revoke all approval and buyer-specific gates until this SKU is checked again.
    finalZipFreightVerified: false,
    mediaRightsVerified: false,
    promotionMediaPolicy: null,
    checkoutInfrastructureVerified: false,
    checkoutAllowed: false,
    automaticPromotionAllowed: false,
    fulfillmentRouteVerified: false,
    status: c.independentIdentityMatch === true ? 'fresh_commercial_evidence_required' : c.status,
  })) : [];
  // Recheck carried evidence after policy corrections. A prior accepted title
  // must not preserve stock/freight or commercial approval for a newly rejected identity.
  const combined = [...current, ...retained].map(source => {
    const row = normalizeFreight(source);
    if (matchesIntendedProduct({slug: row.slug}, row.observedProduct)) return row;
    return {...row, independentIdentityMatch: row.slug ? false : null,
      status: row.supplierClaimedMatch ? (row.slug ? 'identity_rejected' : 'manual_identity_check_required') : row.status,
      variantStockVerified: false, freightEstimateVerified: false,
      countryFreightEstimated: false, illustrativeZipFreightEstimated: false,
      mediaRightsVerified: false, promotionMediaPolicy: null,
      finalZipFreightVerified: false, checkoutInfrastructureVerified: false,
      checkoutAllowed: false, automaticPromotionAllowed: false};
  });
  return {
    ...fresh, latestBatchCandidateCount: fresh.sourceCandidateCount,
    sourceCandidateCount: combined.length, candidates: combined,
    liveStoreCandidateCount: combined.filter(c => c.liveStoreProduct).length,
    independentProductMatches: combined.filter(c => c.independentIdentityMatch === true).length,
    rejectedFalseMatches: combined.filter(c => c.status === 'identity_rejected').length,
    verifiedVariantCount: combined.filter(c => c.variantStockVerified).length,
    freightEstimateCount: combined.filter(c => c.freightEstimateVerified).length,
    countryFreightEstimateCount: combined.filter(c => c.countryFreightEstimated).length,
    illustrativeZipFreightEstimateCount: combined.filter(c => c.illustrativeZipFreightEstimated).length,
    finalZipFreightCount: combined.filter(c => c.finalZipFreightVerified).length,
    mediaRightsVerifiedCount: combined.filter(c => c.mediaRightsVerified).length,
    checkoutInfrastructureVerifiedCount: combined.filter(c => c.checkoutInfrastructureVerified).length,
    promotionAuthorizedCount: combined.filter(c => c.automaticPromotionAllowed).length,
    saleReadyCount: combined.filter(isSaleReady).length,
    zeroPricedCandidateCount: combined.filter(c => c.zeroPricedMethodCount > 0).length,
  };
}

export async function main(source = 'growth-reports/cj-supplier-verification.json', destination = 'growth-reports/cj-worker-review.json') {
  const report = JSON.parse(await fs.readFile(source, 'utf8'));
  // Prior artifact schemas may lack slugs. Join exactly by normalized candidate
  // names from both the live-store and research catalogs, never by fuzzy titles.
  try {
    const catalogs = await Promise.all([
      fs.readFile('services/physical-orders/live-catalog-candidates.json', 'utf8').then(JSON.parse).catch(() => ({candidates:[]})),
      fs.readFile('public/viral-candidates.json', 'utf8').then(JSON.parse).catch(() => ({candidates:[]})),
    ]);
    const names = new Map(catalogs.flatMap(c => c.candidates || [])
      .map(c => [String(c.name || '').trim().toLowerCase(), c.slug]));
    report.results = report.results.map(r => ({...r, slug: r.slug || names.get(String(r.candidate || '').trim().toLowerCase()) || null}));
  } catch { /* Missing catalogs leave identities awaiting manual review. */ }
  let authorization = null;
  try {
    authorization = JSON.parse(await fs.readFile('config/retail-commercial-authorization.json', 'utf8'));
  } catch { /* Missing owner authorization keeps commercial gates closed. */ }
  const current = buildCJReview(report, authorization);
  let previous = null;
  try { previous = JSON.parse(await fs.readFile(destination, 'utf8')); } catch { /* first batch */ }
  const output = mergeCJReview(previous, current);
  await fs.mkdir('growth-reports', {recursive:true});
  await fs.writeFile(destination, JSON.stringify(output, null, 2) + '\n');
  const summary = {
    checkedAt: output.checkedAt, cjAuthentication: output.authenticationVerified,
    candidatesReviewed: output.sourceCandidateCount, liveStoreCandidates: output.liveStoreCandidateCount,
    genuineMatches: output.independentProductMatches,
    falseMatchesRejected: output.rejectedFalseMatches,
    variantsConfirmed: output.verifiedVariantCount,
    freightEstimates: output.freightEstimateCount,
    countryFreightEstimates: output.countryFreightEstimateCount,
    illustrativeZipFreightEstimates: output.illustrativeZipFreightEstimateCount,
    finalZipFreight: output.finalZipFreightCount,
    mediaRightsVerified: output.mediaRightsVerifiedCount,
    checkoutInfrastructureVerified: output.checkoutInfrastructureVerifiedCount,
    promotionAuthorized: output.promotionAuthorizedCount,
    zeroPricedCandidatesNeedingManualQuote: output.zeroPricedCandidateCount,
    saleReady: output.saleReadyCount,
  };
  console.log(JSON.stringify(summary));
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,
      '\n## CJ supplier review (read-only)\n\n' +
      Object.entries(summary).map(([k,v]) => '- ' + k + ': ' + v).join('\n') + '\n');
  }
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
