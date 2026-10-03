import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildCJReview } from './cj-review-board.mjs';

const authorization=JSON.parse(await fs.readFile('config/retail-commercial-authorization.json','utf8'));
const base={checkedAt:'2026-10-03T17:00:00Z',market:'US',authentication:'verified'};

test('Garment Steamer receives checkout infrastructure credit but remains blocked without final buyer ZIP freight',()=>{
  const board=buildCJReview({...base,results:[{
    slug:'garment-steamer',candidate:'Portable Garment Steamer',liveStoreProduct:true,retailPriceUsd:29.95,
    supplierVerified:true,variantInventoryVerified:true,freightVerified:true,freightQuoteScope:'country_estimate',
    finalZipFreightVerified:false,
    product:{name:'Portable Garment Clothes Steamer',sku:'CJYD1883661',variantSku:'CJYD188366101AZ'}
  }]},authorization);
  const row=board.candidates[0];
  assert.equal(row.independentIdentityMatch,true);
  assert.equal(row.checkoutInfrastructureVerified,true);
  assert.equal(row.finalZipFreightVerified,false);
  assert.equal(row.checkoutAllowed,false);
  assert.equal(row.status,'final_zip_freight_required');
  assert.equal(board.saleReadyCount,0);
});

test('checkout permission still requires exact final ZIP evidence even for verified Stripe infrastructure',()=>{
  const board=buildCJReview({...base,results:[{
    slug:'garment-steamer',candidate:'Portable Garment Steamer',liveStoreProduct:true,retailPriceUsd:29.95,
    supplierVerified:true,variantInventoryVerified:true,freightVerified:true,freightQuoteScope:'country_estimate',
    finalZipFreightVerified:true,
    product:{name:'Portable Garment Clothes Steamer',sku:'CJYD1883661',variantSku:'CJYD188366101AZ'}
  }]},authorization);
  const row=board.candidates[0];
  assert.equal(row.checkoutInfrastructureVerified,true);
  assert.equal(row.checkoutAllowed,true);
  assert.equal(row.status,'commercial_review_required');
});
