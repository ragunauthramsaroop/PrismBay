import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCJReview, mergeCJReview} from './cj-review-board.mjs';
const base={checkedAt:'2026-09-26T16:52:56.364Z',market:'US',authentication:'verified'};

test('rejects stocked kitchen rugs as gripper accessories even with a freight quote',()=>{
 const b=buildCJReview({...base,results:[{
  slug:'rug-grippers',candidate:'Reusable Rug Grippers',supplierVerified:true,
  variantInventoryVerified:true,freightVerified:true,freightQuoteScope:'country_estimate',
  product:{name:'Kitchen Rug Sets Of 3 Washable Boho Kitchen Rugs And Runner Carpets Non Slip Kitchen Area Rug For Laundry Room Entryway Hallway',sku:'CJLY2790309',variantSku:'CJLY27903090001'},
 }]});
 assert.equal(b.independentProductMatches,0);
 assert.equal(b.rejectedFalseMatches,1);
 assert.equal(b.verifiedVariantCount,0);
 assert.equal(b.freightEstimateCount,0);
 assert.equal(b.countryFreightEstimateCount,0);
 assert.equal(b.candidates[0].status,'identity_rejected');
 assert.equal(b.candidates[0].checkoutAllowed,false);
});

test('rejects the two unrelated products claimed as CJ supplier matches',()=>{
 const b=buildCJReview({...base,results:[
   {slug:'cordless-handheld-vacuum',candidate:'Cordless Handheld Vacuum',supplierVerified:true,variantInventoryVerified:false,freightVerified:false,product:{name:'VEVOR Wet Dry Vac, 2.6 Gallon, Portable Shop Vacuum'}},
   {slug:'hanging-closet-organizer',candidate:'Hanging Closet Organizer',supplierVerified:true,variantInventoryVerified:false,freightVerified:false,product:{name:'Wall-door Mounted Jewelry Wardrobe Large Capacity Mirror And LED Light Lockable Organizer'}}
 ]});
 assert.equal(b.independentProductMatches,0);
 assert.equal(b.rejectedFalseMatches,2);
 assert.equal(b.saleReadyCount,0);
 assert.ok(b.candidates.every(c=>c.status==='identity_rejected'&&!c.checkoutAllowed&&!c.automaticPromotionAllowed));
});

test('correct country estimate still requires exact destination freight',()=>{
 const b=buildCJReview({...base,results:[{
  slug:'cordless-handheld-vacuum',candidate:'Cordless Handheld Vacuum',
  supplierVerified:true,variantInventoryVerified:true,freightVerified:true,freightQuoteScope:'country_estimate',
  product:{name:'Cordless Portable Handheld Vacuum Cleaner'}
 }]});
 assert.equal(b.independentProductMatches,1);
 assert.equal(b.verifiedVariantCount,1);
 assert.equal(b.freightEstimateCount,1);
 assert.equal(b.countryFreightEstimateCount,1);
 assert.equal(b.illustrativeZipFreightEstimateCount,0);
 assert.equal(b.saleReadyCount,0);
 assert.equal(b.candidates[0].status,'final_zip_freight_required');
 assert.equal(b.candidates[0].checkoutAllowed,false);
 assert.equal(b.candidates[0].mediaRightsVerified,false);
});

test('Tip ZIP estimate is tracked separately from a country estimate',()=>{
 const b=buildCJReview({...base,results:[{
  slug:'pressure-washer',candidate:'Cordless Pressure Washer',liveStoreProduct:true,retailPriceUsd:69.95,
  supplierVerified:true,variantInventoryVerified:true,freightVerified:true,freightQuoteScope:'tip_example_zip_estimate',
  product:{name:'Cordless Portable Pressure Washer'}
 }]});
 assert.equal(b.liveStoreCandidateCount,1);
 assert.equal(b.freightEstimateCount,1);
 assert.equal(b.countryFreightEstimateCount,0);
 assert.equal(b.illustrativeZipFreightEstimateCount,1);
 assert.equal(b.candidates[0].freightEstimateVerified,true);
 assert.equal(b.candidates[0].countryFreightEstimated,false);
 assert.equal(b.candidates[0].illustrativeZipFreightEstimated,true);
 assert.equal(b.candidates[0].checkoutAllowed,false);
});

test('zero-price freight methods and SKU remain blocked in sanitized review',()=>{
 const b=buildCJReview({...base,results:[{
  slug:'hanging-closet-organizer',candidate:'Hanging Closet Organizer',
  supplierVerified:true,variantInventoryVerified:true,freightVerified:false,
  product:{name:'Hanging Closet Shelf Storage Organizer',sku:'CJ-P1',variantSku:'CJ-V1'},
  freightDiagnostic:'zero_priced_methods_require_supplier_confirmation',
  zeroPriceQuoteCount:11,freightQuoteScope:null,
 }]});
 assert.equal(b.candidates[0].status,'destination_freight_required');
 assert.equal(b.zeroPricedCandidateCount,1);
 assert.equal(b.candidates[0].observedVariantSku,'CJ-V1');
 assert.equal(b.candidates[0].zeroPricedMethodCount,11);
 assert.equal(b.candidates[0].checkoutAllowed,false);
});

test('unknown identity and missing reports fail closed',()=>{
 const b=buildCJReview({...base,results:[{candidate:'new item',supplierVerified:true,product:{name:'Mystery item'}}]});
 assert.equal(b.candidates[0].status,'manual_identity_check_required');
 assert.throws(()=>buildCJReview({results:[]}),/invalid/);
});

test('scheduled batches accumulate without reviving stale evidence',()=>{
 const previous=buildCJReview({checkedAt:'2026-09-26T12:00:00Z',authentication:'verified',results:[
  {slug:'cordless-handheld-vacuum',candidate:'Cordless Handheld Vacuum',supplierVerified:true,product:{name:'Cordless Handheld Vacuum Cleaner'},variantInventoryVerified:false,freightVerified:false}
 ]});
 const current=buildCJReview({checkedAt:'2026-09-26T18:00:00Z',authentication:'verified',results:[
  {slug:'roll-up-dish-rack',candidate:'Roll-Up Dish Drying Rack',supplierVerified:false}
 ]});
 const merged=mergeCJReview(previous,current);
 assert.equal(merged.latestBatchCandidateCount,1);
 assert.equal(merged.sourceCandidateCount,2);
 assert.equal(merged.independentProductMatches,1);
 const expired=mergeCJReview(previous,{...current,checkedAt:'2026-09-28T10:00:00Z'});
 assert.equal(expired.sourceCandidateCount,1);
 assert.equal(expired.saleReadyCount,0);
});

test('carried supplier classifications are checked against corrected identity rules',()=>{
 const previous={checkedAt:'2026-09-30T06:00:00Z',candidates:[{
  slug:'rug-grippers',candidate:'Reusable Rug Grippers',
  observedProduct:'Kitchen Rug Sets Of 3 Washable Boho Kitchen Rugs And Runner Carpets Non Slip Kitchen Area Rug For Laundry Room Entryway Hallway',
  supplierClaimedMatch:true,independentIdentityMatch:true,status:'commercial_review_required',
  variantStockVerified:true,countryFreightEstimated:true,observedAt:'2026-09-30T06:00:00Z',
 }]};
 const fresh=buildCJReview({checkedAt:'2026-09-30T12:00:00Z',authentication:'verified',results:[
  {slug:'bottle-brush-set',candidate:'Bottle Brush Set',supplierVerified:false},
 ]});
 const merged=mergeCJReview(previous,fresh);
 const rug=merged.candidates.find(row=>row.slug==='rug-grippers');
 assert.equal(rug.status,'identity_rejected');
 assert.equal(rug.observedAt,'2026-09-30T06:00:00Z');
 assert.equal(merged.independentProductMatches,0);
 assert.equal(merged.verifiedVariantCount,0);
 assert.equal(merged.freightEstimateCount,0);
 assert.equal(merged.countryFreightEstimateCount,0);
 assert.equal(merged.rejectedFalseMatches,1);
});

test('retained supplier evidence never preserves revoked approval or destination-specific freight', () => {
 const earlier = {
  checkedAt: '2026-10-23T12:00:00Z',
  candidates: [{
   slug: 'garment-steamer', candidate: 'Portable Garment Steamer',
   observedProduct: 'USB Handheld Garment Steamer Household Portable Electric Iron',
   observedAt: '2026-10-23T12:00:00Z',
   supplierClaimedMatch: true, independentIdentityMatch: true,
   variantStockVerified: true, freightEstimateVerified: true,
   freightQuoteScope: 'country_estimate',
   finalZipFreightVerified: true, mediaRightsVerified: true,
   promotionMediaPolicy: 'original_graphics_and_original_copy_only',
   checkoutInfrastructureVerified: true, checkoutAllowed: true,
   automaticPromotionAllowed: true, fulfillmentRouteVerified: true,
   status: 'commercial_review_required',
  }],
 };
 const current = buildCJReview({
  checkedAt: '2026-10-23T18:00:00Z', authentication: 'verified',
  results: [{slug: 'roll-up-dish-rack', candidate: 'Roll-Up Dish Drying Rack', supplierVerified: false}],
 });
 const merged = mergeCJReview(earlier, current);
 const carried = merged.candidates.find(c => c.slug === 'garment-steamer');
 assert.ok(carried);
 assert.equal(carried.independentIdentityMatch, true);
 assert.equal(carried.variantStockVerified, true);
 assert.equal(carried.freightEstimateVerified, true);
 assert.equal(carried.countryFreightEstimated, true);
 assert.equal(carried.status, 'fresh_commercial_evidence_required');
 for (const key of ['finalZipFreightVerified', 'mediaRightsVerified',
   'checkoutInfrastructureVerified', 'checkoutAllowed',
   'automaticPromotionAllowed', 'fulfillmentRouteVerified']) {
  assert.equal(carried[key], false, key);
 }
 assert.equal(carried.promotionMediaPolicy, null);
 assert.equal(merged.finalZipFreightCount, 0);
 assert.equal(merged.promotionAuthorizedCount, 0);
 assert.equal(merged.saleReadyCount, 0);
});

test('owner promotion policy never clears a product with missing fulfillment or freight gates', () => {
  const authorization = {
    ownerAuthorized: true, paidSpendAuthorized: false, bulkOutreachAuthorized: false,
    media: { promotionMediaRightsVerified: true, policy: 'original_graphics_and_original_copy_only',
      supplierMediaAuthorized: false, thirdPartyMediaAuthorized: false },
    promotion: { automaticPromotionAllowedAfterAllOtherGates: true },
    checkoutInfrastructure: { deployed: true, stripeWebhookSecretConfigured: true,
      verifiedCheckoutSkus: ['garment-steamer'] },
  };
  const row = {
    slug: 'garment-steamer', candidate: 'Portable Garment Steamer',
    supplierVerified: true, variantInventoryVerified: true, freightVerified: true,
    finalZipFreightVerified: true, freightQuoteScope: 'buyer_destination_zip',
    fulfillmentRouteVerified: false,
    product: { name: 'USB Handheld Garment Steamer Household Portable Electric Iron' },
  };
  const withoutFulfillment = buildCJReview({ ...base, results: [row] }, authorization);
  assert.equal(withoutFulfillment.candidates[0].independentIdentityMatch, true);
  assert.equal(withoutFulfillment.candidates[0].promotionPolicyAuthorized, true);
  assert.equal(withoutFulfillment.candidates[0].checkoutAllowed, true);
  assert.equal(withoutFulfillment.candidates[0].automaticPromotionAllowed, false);
  assert.equal(withoutFulfillment.candidates[0].status, 'fulfillment_route_required');
  assert.equal(withoutFulfillment.promotionAuthorizedCount, 0);
  assert.equal(withoutFulfillment.saleReadyCount, 0);

  const withFulfillment = buildCJReview({ ...base, results: [{ ...row, fulfillmentRouteVerified: true }] }, authorization);
  assert.equal(withFulfillment.candidates[0].automaticPromotionAllowed, true);
  assert.equal(withFulfillment.candidates[0].fulfillmentRouteVerified, true);
  assert.equal(withFulfillment.saleReadyCount, 1);

  const missingZip = buildCJReview({ ...base, results: [{ ...row,
    fulfillmentRouteVerified: true, finalZipFreightVerified: false }] }, authorization);
  assert.equal(missingZip.candidates[0].automaticPromotionAllowed, false);
  assert.equal(missingZip.saleReadyCount, 0);
});

test('contradictory supplier pack counts never inherit stock, freight or commercial approval', () => {
  const report = buildCJReview({
    ...base,
    results: [
      {
        slug: 'crevice', candidate: '3-in-1 Crevice Cleaning Brush',
        supplierVerified: true, variantInventoryVerified: true,
        freightVerified: true, finalZipFreightVerified: true,
        fulfillmentRouteVerified: true,
        product: {
          name: '4 In 1 Bottle Gap Cleaner Brush Multifunctional Cup Cleaning Brushes',
          sku: 'CJJT1731477', variantSku: 'CJJT173147702BY',
        },
      },
      {
        slug: 'drain-catcher', candidate: 'Sink Drain Catcher 2-Pack',
        supplierVerified: true, variantInventoryVerified: true,
        freightVerified: true, finalZipFreightVerified: true,
        fulfillmentRouteVerified: true,
        product: {
          name: '3PCS Silicone Starfish-shaped Sink Drain Filter Bathtub Hair Catcher',
          sku: 'CJCF1653868',
        },
      },
    ],
  }, {
    ownerAuthorized: true,
    paidSpendAuthorized: false,
    bulkOutreachAuthorized: false,
    media: { promotionMediaRightsVerified: true, policy: 'original_graphics_and_original_copy_only' },
    promotion: { automaticPromotionAllowedAfterAllOtherGates: true },
    checkoutInfrastructure: {
      deployed: true, stripeWebhookSecretConfigured: true,
      verifiedCheckoutSkus: ['crevice', 'drain-catcher'],
    },
  });
  assert.equal(report.independentProductMatches, 0);
  assert.equal(report.rejectedFalseMatches, 2);
  assert.equal(report.verifiedVariantCount, 0);
  assert.equal(report.freightEstimateCount, 0);
  assert.equal(report.saleReadyCount, 0);
  assert.equal(report.promotionAuthorizedCount, 0);
  for (const row of report.candidates) {
    assert.equal(row.status, 'identity_rejected');
    assert.equal(row.independentIdentityMatch, false);
    assert.equal(row.variantStockVerified, false);
    assert.equal(row.finalZipFreightVerified, false);
    assert.equal(row.checkoutAllowed, false);
    assert.equal(row.automaticPromotionAllowed, false);
  }
});

test('final buyer ZIP approval rejects country, example and missing quote scope', () => {
  const authorization = {
    ownerAuthorized: true, paidSpendAuthorized: false, bulkOutreachAuthorized: false,
    media: { promotionMediaRightsVerified: true, policy: 'original_graphics_and_original_copy_only',
      supplierMediaAuthorized: false, thirdPartyMediaAuthorized: false },
    promotion: { automaticPromotionAllowedAfterAllOtherGates: true },
    checkoutInfrastructure: { deployed: true, stripeWebhookSecretConfigured: true,
      verifiedCheckoutSkus: ['garment-steamer'] },
  };
  const row = {
    slug: 'garment-steamer', candidate: 'Portable Garment Steamer',
    supplierVerified: true, variantInventoryVerified: true, freightVerified: true,
    finalZipFreightVerified: true, fulfillmentRouteVerified: true,
    product: { name: 'Portable Garment Clothes Steamer' },
  };
  for (const scope of [undefined, null, 'country_estimate', 'example_zip_estimate',
    'tip_example_zip_estimate', 'unrecognized_scope']) {
    const review = buildCJReview({ ...base, results: [{ ...row, freightQuoteScope: scope }] }, authorization);
    const candidate = review.candidates[0];
    assert.equal(candidate.finalZipFreightVerified, false, String(scope));
    assert.equal(candidate.checkoutAllowed, false, String(scope));
    assert.equal(candidate.automaticPromotionAllowed, false, String(scope));
    assert.equal(review.saleReadyCount, 0, String(scope));
  }
  const verified = buildCJReview({ ...base,
    results: [{ ...row, freightQuoteScope: 'buyer_destination_zip' }] }, authorization);
  assert.equal(verified.candidates[0].finalZipFreightVerified, true);
  assert.equal(verified.candidates[0].checkoutAllowed, true);
  assert.equal(verified.saleReadyCount, 1);
});

test('unauthenticated CJ reports never confer product identity, variant stock, freight or sale readiness', () => {
 const authorization = {
  ownerAuthorized: true, paidSpendAuthorized: false, bulkOutreachAuthorized: false,
  media: { promotionMediaRightsVerified: true, policy: 'original_graphics_and_original_copy_only',
   supplierMediaAuthorized: false, thirdPartyMediaAuthorized: false },
  promotion: { automaticPromotionAllowedAfterAllOtherGates: true },
  checkoutInfrastructure: { deployed: true, stripeWebhookSecretConfigured: true,
   verifiedCheckoutSkus: ['garment-steamer'] },
 };
 const row = {
  slug: 'garment-steamer', candidate: 'Portable Garment Steamer',
  supplierVerified: true, variantInventoryVerified: true, freightVerified: true,
  finalZipFreightVerified: true, freightQuoteScope: 'buyer_destination_zip',
  fulfillmentRouteVerified: true,
  product: { name: 'USB Handheld Garment Steamer Household Portable Electric Iron' },
 };
 for (const authentication of [undefined, 'denied', 'expired']) {
  const review = buildCJReview({...base, authentication, results: [row]}, authorization);
  const candidate = review.candidates[0];
  assert.equal(review.authenticationVerified, false);
  assert.equal(review.independentProductMatches, 0);
  assert.equal(candidate.independentIdentityMatch, null);
  assert.equal(review.verifiedVariantCount, 0);
  assert.equal(review.freightEstimateCount, 0);
  assert.equal(review.finalZipFreightCount, 0);
  assert.equal(candidate.checkoutAllowed, false);
  assert.equal(candidate.fulfillmentRouteVerified, false);
  assert.equal(candidate.automaticPromotionAllowed, false);
  assert.equal(review.saleReadyCount, 0);
  assert.equal(candidate.status, 'supplier_authentication_required');
 }
 const verified = buildCJReview({...base, results: [row]}, authorization);
 assert.equal(verified.authenticationVerified, true);
 assert.equal(verified.independentProductMatches, 1);
 assert.equal(verified.verifiedVariantCount, 1);
});
