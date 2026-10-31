import test from 'node:test';
import assert from 'node:assert/strict';
import {cjSearchDiagnostic} from './cj-search-recovery.mjs';
import {buildCJReview} from './cj-review-board.mjs';

test('CJ 1600014 means disabled account, never a parameter problem or a purchasable product',()=>{
 const x=cjSearchDiagnostic(new Error('CJ request failed (HTTP 200, code 1600014)'));
 assert.deepEqual(x,{code:'1600014',kind:'account_disabled',fatal:true});
 const report=buildCJReview({
   checkedAt:'2026-10-31T18:51:42.576Z',
   authentication:'verified',
   market:'US',
   results:[{
     slug:'pethair',
     candidate:'Reusable Pet Hair Remover',
     status:'supplier_account_disabled',
     searchFailureCodes:['1600014'],
     supplierVerified:false,
     variantInventoryVerified:false,
     freightVerified:false,
   }]
 });
 assert.equal(report.candidates.length,1);
 assert.equal(report.candidates[0].status,'supplier_account_reactivation_required');
 assert.equal(report.candidates[0].checkoutAllowed,false);
 assert.equal(report.candidates[0].automaticPromotionAllowed,false);
 assert.equal(report.saleReadyCount,0);
 assert.equal(JSON.stringify(report).includes('1600014'),false);
});
