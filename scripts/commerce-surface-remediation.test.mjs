import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSurfaceRemediation} from './commerce-surface-remediation.mjs';

test('missing product IDs become priority-one storefront remediation',()=>{
 const board=buildSurfaceRemediation({technicalSurfaceReady:false,issueCount:2,products:{products:[{id:null,issues:['missing_id']},{id:null,issues:['missing_id']}]} ,merchant:{issues:[]},sitemap:{issues:[]},robots:{issues:[]}});
 assert.equal(board.activeTaskCount,1);
 assert.equal(board.tasks[0].id,'products-json-stable-ids');
 assert.equal(board.tasks[0].priority,1);
 assert.equal(board.tasks[0].owner,'storefront-conversion');
});

test('healthy commerce surfaces generate no repair tasks',()=>{
 const board=buildSurfaceRemediation({technicalSurfaceReady:true,issueCount:0,products:{products:[]},merchant:{issues:[]},sitemap:{issues:[]},robots:{issues:[]}});
 assert.equal(board.activeTaskCount,0);
 assert.equal(board.technicalSurfaceReady,true);
});

test('legacy checkout and merchant-feed exposure becomes priority-zero owner action',()=>{
 const board=buildSurfaceRemediation({
  technicalSurfaceReady:true,issueCount:0,
  products:{products:[]},merchant:{issues:[]},sitemap:{issues:[]},robots:{issues:[]},
  legacyExposure:{safe:false,directCheckoutLinkCount:3,saleSchemaPageCount:4,inStockFeedRowCount:3,issues:['legacy_direct_physical_checkout_exposed']}
 });
 assert.equal(board.activeTaskCount,1);
 assert.equal(board.tasks[0].id,'legacy-storefront-commercial-exposure');
 assert.equal(board.tasks[0].priority,0);
 assert.equal(board.nextAction,board.tasks[0].title);
});
