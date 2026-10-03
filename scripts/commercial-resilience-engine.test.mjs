import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSupplierPortfolioBoard, buildOfferTournament, buildCheckoutRecoveryBoard } from './commercial-resilience-engine.mjs';

const policy = {
  supplierPortfolio: { targetVerifiedRoutesPerSku: 3 },
  economics: { minimumContributionUsd: 3, minimumContributionPct: 25, maximumLandedPctOfRetail: 55, defaultFeeRatePct: 3.2, defaultReturnReservePct: 5 },
  offerTournament: { quantities: [1,3,5], singleUnitPriceTestsPct: [-5,0,5], bundleDiscountTestsPct: [0,5,10] },
  checkoutRecovery: {
    replacementSupplierErrors: ['verified_origin_stock_unavailable','stock_changed_since_quote','priced_freight_unavailable'],
    offerErrors: ['economics_changed_since_quote'],
    checkoutErrors: ['quote_expired']
  }
};

const sourcing = { results: [{
  slug: 'crevice',
  supplierRoutePortfolio: [
    { productId:'P1', variantId:'V1', originCountryCode:'US', inventory:50, productCostUsd:2, screeningFreightUsd:3, screenedSingleUnitLandedUsd:5, variantInventoryVerified:true, screeningFreightVerified:true },
    { productId:'P2', variantId:'V2', originCountryCode:'US', inventory:20, productCostUsd:2.5, screeningFreightUsd:3.5, screenedSingleUnitLandedUsd:6, variantInventoryVerified:true, screeningFreightVerified:true },
    { productId:'P3', variantId:'V3', originCountryCode:'CN', inventory:100, productCostUsd:1.5, screeningFreightUsd:5, screenedSingleUnitLandedUsd:6.5, variantInventoryVerified:true, screeningFreightVerified:true }
  ],
  packFreightScreening: [
    {quantity:1, priced:true, landedCostUsd:5},
    {quantity:3, priced:true, landedCostUsd:11},
    {quantity:5, priced:true, landedCostUsd:16}
  ]
}]};
const opportunities = { candidates: [{ slug:'crevice', storeSku:'crevice', name:'Crevice brush' }] };

test('supplier board proposes verified primary and backups and scores low concentration risk', () => {
  const board = buildSupplierPortfolioBoard({ sourcing, opportunities, policy });
  assert.equal(board.routePromotionProposals.length, 1);
  assert.equal(board.products[0].verifiedRouteCount, 3);
  assert.equal(board.products[0].independentSupplierCount, 3);
  assert.equal(board.products[0].supplierRouteDeficit, 0);
  assert.equal(board.products[0].promotionProposal.automaticActivation, false);
  assert.equal(board.products[0].promotionProposal.finalBuyerZipStillRequired, true);
});

test('single route is high concentration and creates route deficit', () => {
  const weak = structuredClone(sourcing); weak.results[0].supplierRoutePortfolio = weak.results[0].supplierRoutePortfolio.slice(0,1);
  const product = buildSupplierPortfolioBoard({ sourcing:weak, opportunities, policy }).products[0];
  assert.equal(product.supplierConcentrationRisk, 'critical');
  assert.equal(product.supplierRouteDeficit, 2);
});

test('offer tournament generates measured-only single and bundle hypotheses without changing live price', () => {
  const supplierBoard = buildSupplierPortfolioBoard({ sourcing, opportunities, policy });
  const board = buildOfferTournament({ supplierBoard, quoteRuntime:{products:[{sku:'crevice',retailUsd:19.99}]}, economicsEvidence:{}, policy });
  assert.ok(board.hypothesisCount >= 9);
  assert.equal(board.products[0].elasticityStatus, 'unmeasured_until_real_conversion_evidence_exists');
  assert.ok(board.products[0].viableHypotheses.length > 0);
  assert.equal(board.products[0].hypotheses.every(x => x.livePriceChangeAllowed === false), true);
  assert.ok(board.products[0].recommendedTestSequence.length > 0);
});

test('checkout supplier failure becomes supplier replacement task with alternative route context', () => {
  const supplierBoard = buildSupplierPortfolioBoard({ sourcing, opportunities, policy });
  const board = buildCheckoutRecoveryBoard({ failureEvidence:{events:[{sku:'crevice',error:'stock_changed_since_quote'}]}, supplierBoard, policy });
  assert.equal(board.tasks.length,1);
  assert.equal(board.tasks[0].owner,'supplier-fulfillment');
  assert.equal(board.tasks[0].action,'promote_or_verify_alternative_supplier_route');
  assert.equal(board.tasks[0].alternativeVerifiedRoutes,2);
});

test('economics and quote-session failures route to the correct specialist companies', () => {
  const supplierBoard = buildSupplierPortfolioBoard({ sourcing, opportunities, policy });
  const board = buildCheckoutRecoveryBoard({ failureEvidence:{events:[{sku:'crevice',error:'economics_changed_since_quote'},{sku:'crevice',error:'quote_expired'}]}, supplierBoard, policy });
  assert.deepEqual(board.tasks.map(x=>x.owner),['offer-engineering','storefront-conversion']);
});
