import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStrategyBoard} from './paperclip-sales-strategy-engine.mjs';

const portfolio={minimumConcurrentPathsBeforeFirstSale:8,rules:{zeroCostFirst:true},strategies:[
{id:'primary-product-gate-closure',owner:'supplier-fulfillment',class:'product_readiness',action:'a',fallback:'f'},
{id:'backup-product-race',owner:'product-intelligence',class:'portfolio',action:'a',fallback:'f'},
{id:'owned-search-seo',owner:'organic-growth',class:'acquisition',action:'a',fallback:'f'},
{id:'google-free-listings',owner:'organic-growth',class:'acquisition',action:'a',fallback:'f'},
{id:'pinterest-product-pins',owner:'organic-growth',class:'acquisition',action:'a',fallback:'f'},
{id:'tiktok-shop-affiliate',owner:'creator-affiliate-growth',class:'performance_distribution',action:'a',fallback:'f'},
{id:'marketplace-listing-packages',owner:'organic-growth',class:'marketplace',action:'a',fallback:'f'},
{id:'offer-bundle-engineering',owner:'offer-engineering',class:'offer',action:'a',fallback:'f'},
{id:'storefront-cro',owner:'storefront-conversion',class:'conversion',action:'a',fallback:'f'},
{id:'short-form-creative-library',owner:'creative-studio',class:'creative',action:'a',fallback:'f'},
{id:'creator-affiliate-shortlist',owner:'creator-affiliate-growth',class:'performance_distribution',action:'a',fallback:'f'},
{id:'conversion-experiment-backlog',owner:'experiment-lab',class:'experimentation',action:'a',fallback:'f'}]};

const supplier={saleReadyCount:0,candidates:[{slug:'crevice',independentIdentityMatch:true,variantStockVerified:true,freightEstimateVerified:true,finalZipFreightVerified:false,mediaRightsVerified:true,checkoutAllowed:false,automaticPromotionAllowed:true}]};

test('runs diversified strategy portfolio before first sale',()=>{
 const b=buildStrategyBoard({portfolio,supplier,firstSale:{verifiedFirstSale:false},promotion:{promotionEligibleCount:0}});
 assert.equal(b.mode,'ceo_multi_path_first_sale');
 assert.equal(b.concurrentStrategyCount,12);
 assert.equal(b.primaryProduct,'crevice');
 assert.ok(b.primaryRemainingGates.includes('final_zip_freight'));
 assert.ok(b.primaryRemainingGates.includes('checkout'));
 assert.ok(b.acquisitionPaths.length>=6);
 assert.ok(b.strategies.every(x=>x.state!=='idle'));
});

test('external product-distribution paths wait for sale-ready product but keep preparation active',()=>{
 const b=buildStrategyBoard({portfolio,supplier,firstSale:{verifiedFirstSale:false},promotion:{promotionEligibleCount:0}});
 const g=b.strategies.find(x=>x.id==='google-free-listings');
 assert.equal(g.state,'active_internal_prepare');
 assert.deepEqual(g.blockedBy,['sale_ready_product']);
 const seo=b.strategies.find(x=>x.id==='owned-search-seo');
 assert.equal(seo.state,'active_internal_prepare');
});

test('sale-ready product moves acquisition strategies to activation checks without pretending publication is authorized',()=>{
 const ready={...supplier.candidates[0],finalZipFreightVerified:true,checkoutAllowed:true};
 const b=buildStrategyBoard({portfolio,supplier:{...supplier,saleReadyCount:1,candidates:[ready]},firstSale:{verifiedFirstSale:false},promotion:{promotionEligibleCount:1}});
 assert.equal(b.strategies.find(x=>x.id==='google-free-listings').state,'account_or_owner_activation_check');
 assert.equal(b.strategies.find(x=>x.id==='owned-search-seo').state,'activation_ready');
});

test('fails closed if strategy diversification falls below CEO minimum',()=>{
 assert.throws(()=>buildStrategyBoard({portfolio:{...portfolio,strategies:portfolio.strategies.slice(0,7)},supplier,firstSale:{verifiedFirstSale:false},promotion:{promotionEligibleCount:0}}),/insufficient_concurrent_sales_paths/);
});

test('preflight attention never becomes sale-ready stock',()=>{
 const b=buildStrategyBoard({portfolio,supplier,firstSale:{verifiedFirstSale:false},promotion:{promotionEligibleCount:1}});
 assert.equal(b.saleReadyCount,0);
 assert.equal(b.strategies.find(x=>x.id==='google-free-listings').state,'active_internal_prepare');
 assert.deepEqual(b.strategies.find(x=>x.id==='google-free-listings').blockedBy,['sale_ready_product']);
});

test('missing supplier evidence blocks distribution even with eligible promotion',()=>{
 const b=buildStrategyBoard({portfolio,supplier:null,firstSale:{verifiedFirstSale:false},promotion:{promotionEligibleCount:1}});
 assert.equal(b.saleReadyCount,0);
});

test('supplier summary cannot override missing final ZIP freight and checkout',()=>{
 const b=buildStrategyBoard({portfolio,supplier:{...supplier,saleReadyCount:1},firstSale:{verifiedFirstSale:false},promotion:{promotionEligibleCount:1}});
 assert.equal(b.saleReadyCount,0);
 assert.equal(b.strategies.find(x=>x.id==='tiktok-shop-affiliate').state,'active_internal_prepare');
});
