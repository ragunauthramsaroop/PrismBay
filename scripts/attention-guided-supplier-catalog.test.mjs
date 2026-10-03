import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttentionGuidedCatalog } from './attention-guided-supplier-catalog.mjs';

const baseCatalog={market:'US',candidates:[{slug:'crevice',name:'Crevice Cleaning Brush Set',query:'crevice cleaning brush set',queries:['crevice cleaning brush set'],liveStoreProduct:true},{slug:'drain-catcher',name:'Drain Hair Catcher and Strainer',query:'drain hair catcher strainer',queries:['drain hair catcher strainer'],liveStoreProduct:true}]};
const liveCatalog={market:'US',candidates:[{slug:'garment-steamer',name:'Portable Garment Steamer',query:'portable garment clothes steamer',retailPriceUsd:29.95,liveStoreProduct:true},{slug:'unknown',name:'Mystery Product',query:'mystery product',retailPriceUsd:20,liveStoreProduct:true}]};

test('current tournament leader is promoted into supplier search even when absent from static base catalog',()=>{
 const out=buildAttentionGuidedCatalog({baseCatalog,tournament:{productTournament:[{slug:'garment-steamer',researchScore:null},{slug:'crevice',researchScore:97},{slug:'drain-catcher',researchScore:93}]},liveCatalog,limit:3});
 assert.deepEqual(out.leaders,['garment-steamer','crevice','drain-catcher']);
 assert.equal(out.candidates[0].slug,'garment-steamer');
 assert.equal(out.candidates[0].commercialAttentionOverride,true);
 assert.equal(out.candidates[0].liveStoreProduct,true);
});

test('unsupported live SKU is not invented into CJ supplier search',()=>{
 const out=buildAttentionGuidedCatalog({baseCatalog,tournament:{productTournament:[{slug:'unknown'},{slug:'crevice'}]},liveCatalog,limit:2});
 assert.equal(out.candidates.some(x=>x.slug==='unknown'),false);
 assert.equal(out.leaders[0],'crevice');
});

test('existing static supplier candidate retains its exact identity metadata',()=>{
 const exact={...baseCatalog,candidates:[{slug:'crevice',exactSupplierSku:'CJJT1731477',exactVariantSku:'CJJT173147702BY',name:'Crevice Cleaning Brush Set',query:'crevice cleaning brush set',queries:['crevice cleaning brush set'],liveStoreProduct:true}]};
 const out=buildAttentionGuidedCatalog({baseCatalog:exact,tournament:{productTournament:[{slug:'crevice'}]},liveCatalog,limit:1});
 assert.equal(out.candidates[0].exactSupplierSku,'CJJT1731477');
 assert.equal(out.candidates[0].exactVariantSku,'CJJT173147702BY');
});
