import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildApiBlockedReport} from './ebay-control-plane.mjs';

const manifest=JSON.parse(await fs.readFile('marketplaces/ebay/garment-steamer.json','utf8'));

test('disabled CJ API fails closed while preserving draft economics only',()=>{
  const report=buildApiBlockedReport(manifest,'API_ACCESS_DISABLED');
  assert.equal(report.status,'API_ACCESS_DISABLED');
  assert.equal(report.readyForBrowserPublish,false);
  assert.equal(report.cj.authenticated,false);
  assert.equal(report.cj.ebaySellerAuthenticated,false);
  assert.equal(report.cj.liveStockVerified,false);
  assert.equal(report.cj.dispatchLocationVerified,false);
  assert.equal(report.gates.ebaySellerAuthenticated,false);
  assert.equal(report.gates.liveStockVerified,false);
  assert.equal(report.gates.dispatchLocationVerified,false);
  assert.equal(report.product.variantSku,manifest.product.supplier.variantSku);
  assert.equal(report.economics.listPrice!=null,true);
  assert.equal(report.nextAction.includes('Restore CJ API authorization'),true);
});

test('missing secret remains blocked and no unknown status is accepted',()=>{
  assert.equal(buildApiBlockedReport(manifest,'API_KEY_MISSING').readyForBrowserPublish,false);
  assert.throws(()=>buildApiBlockedReport(manifest,'SUCCESS'),/unsupported_block_reason/);
});
