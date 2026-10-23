import test from 'node:test';
import assert from 'node:assert/strict';
import {positiveNumber,chooseProduct,chooseProducts,chooseStock,buildPackScreening,normalizeKnownProduct,candidateVariantChoices,sourceCandidate} from './paperclip-cj-sourcing.mjs';
import {selectRotatingCandidates} from './candidate-rotation.mjs';

test('selects only exact approved on-sale product identity',()=>{
 const c={slug:'car-seat-headrest-hooks'};
 const rows=[{id:'bad',nameEn:'Bathroom Wall Hook Rack',saleStatus:'3',sellPrice:2,totalVerifiedInventory:1000},{id:'good',nameEn:'Car Seat Headrest Bag Hooks',saleStatus:'3',sellPrice:3,totalVerifiedInventory:20}];
 assert.equal(chooseProduct(rows,c)?.id,'good');
});

test('bounded supplier portfolio deduplicates product ids and preserves inventory priority',()=>{
 const c={slug:'crevice'};
 const rows=[
  {id:'p1',nameEn:'Bottle Gap Cleaner Brush',saleStatus:'3',sellPrice:2,totalVerifiedInventory:100},
  {id:'p1',nameEn:'Bottle Gap Cleaner Brush',saleStatus:'3',sellPrice:2,totalVerifiedInventory:90},
  {id:'p2',nameEn:'Crevice Gap Cleaning Brush',saleStatus:'3',sellPrice:2.5,totalVerifiedInventory:80},
  {id:'p3',nameEn:'Water Bottle Gap Cleaner Brush',saleStatus:'3',sellPrice:3,totalVerifiedInventory:70},
  {id:'p4',nameEn:'Bottle Gap Cleaner Brush',saleStatus:'3',sellPrice:3,totalVerifiedInventory:60},
 ];
 assert.deepEqual(chooseProducts(rows,c,3).map(x=>x.id),['p1','p2','p3']);
});

test('normalizes a known CJ product lookup and rejects an echoed SKU mismatch',()=>{
 const c={slug:'crevice',exactSupplierSku:'CJJT1731477',exactVariantSku:'CJJT173147702BY'};
 const mismatchedConfiguration=normalizeKnownProduct({data:{pid:'p1',productSku:'CJJT1731477',productNameEn:'4 In 1 Bottle Gap Cleaner Brush',saleStatus:'3'}},c);
 assert.equal(mismatchedConfiguration,null,'a known SKU cannot override an explicitly conflicting 4-in-1 title');
 const good=normalizeKnownProduct({data:{pid:'p1',productSku:'CJJT1731477',productNameEn:'3 In 1 Crevice Gap Cleaning Brush',saleStatus:'3'}},c);
 assert.equal(good?.id,'p1');
 assert.equal(good?.sku,'CJJT1731477');
 assert.equal(good?.knownIdentitySource,'variant_sku_query');
 assert.equal(good?.knownSupplierSkuEchoed,true);
 const bad=normalizeKnownProduct({data:{pid:'p2',productSku:'OTHER',productNameEn:'3 In 1 Crevice Gap Cleaning Brush',saleStatus:'3'}},c);
 assert.equal(bad,null);
});

test('known product lookup accepts missing SKU echo only when identity name and product id still pass',()=>{
 const c={slug:'drain-catcher',exactSupplierSku:'CJCF1653868'};
 const row=normalizeKnownProduct({data:{pid:'p3',productNameEn:'Silicone Sink Drain Filter Hair Catcher',saleStatus:'3'}},c);
 assert.equal(row?.id,'p3');
 assert.equal(row?.sku,'CJCF1653868');
 assert.equal(row?.knownSupplierSkuEchoed,false);
});

test('exact variant policy never substitutes another variant',()=>{
 const c={slug:'crevice',exactVariantSku:'CJJT173147702BY'};
 const rows=[
  {vid:'wrong-vid',variantSku:'CJJT173147701AZ',variantSellPrice:1.2},
  {vid:'right-vid',variantSku:'CJJT173147702BY',variantSellPrice:1.3},
  {vid:'other-vid',variantSku:'CJJT173147703CX',variantSellPrice:1.1},
 ];
 assert.deepEqual(candidateVariantChoices(rows,c).map(x=>x.vid),['right-vid']);
 assert.deepEqual(candidateVariantChoices(rows,{slug:'crevice'}).map(x=>x.vid),['wrong-vid','right-vid','other-vid']);
});

test('rejects zero prices and prefers usable physical stock',()=>{
 assert.equal(positiveNumber(0),null);
 const stock=chooseStock([{vid:'v',countryCode:'CN',totalInventoryNum:100,cjInventoryNum:20},{vid:'v',countryCode:'US',totalInventoryNum:20,cjInventoryNum:2}], 'v');
 assert.equal(stock.countryCode,'US');
});

test('falls through to a second exact-match supplier when the first has no verified stock',async()=>{
 const candidate={slug:'crevice',name:'Crevice Brush',researchScore:90,queries:['gap cleaner brush']};
 const base='https://developers.cjdropshipping.com/api2.0/v1';
 const client=async(url,opts={})=>{
   const text=String(url);
   if(text.includes('/product/listV2')) return {data:{content:[{productList:[
     {id:'p1',nameEn:'Bottle Gap Cleaner Brush',saleStatus:'3',sellPrice:1.2,totalVerifiedInventory:100},
     {id:'p2',nameEn:'Crevice Gap Cleaning Brush',saleStatus:'3',sellPrice:1.4,totalVerifiedInventory:80},
   ]}]}};
   if(text.includes('/product/variant/query')&&text.includes('pid=p1')) return {data:[{vid:'v1',variantSku:'S1',variantSellPrice:1.2}]};
   if(text.includes('/product/variant/query')&&text.includes('pid=p2')) return {data:[{vid:'v2',variantSku:'S2',variantSellPrice:1.4}]};
   if(text.includes('/product/stock/queryByVid')&&text.includes('vid=v1')) return {data:[{vid:'v1',countryCode:'US',totalInventoryNum:0,cjInventoryNum:0}]};
   if(text.includes('/product/stock/queryByVid')&&text.includes('vid=v2')) return {data:[{vid:'v2',countryCode:'US',totalInventoryNum:50,cjInventoryNum:20}]};
   if(text.endsWith('/logistic/freightCalculate')) return {data:[{logisticName:'USPS',logisticPrice:4,logisticAging:'4-8'}]};
   throw new Error('unexpected '+text);
 };
 const result=await sourceCandidate({client,base,token:'t',candidate});
 assert.equal(result.variantInventoryVerified,true);
 assert.equal(result.product.id,'p2');
 assert.equal(result.selectedSupplierRank,2);
 assert.equal(result.fallbackSupplierUsed,true);
 assert.equal(result.supplierAlternativesFound,2);
});

test('chooses the stocked supplier route with lower screened landed cost',async()=>{
 const candidate={slug:'crevice',name:'Crevice Brush',researchScore:90,queries:['gap cleaner brush'],supplierPortfolioSize:2};
 const base='https://developers.cjdropshipping.com/api2.0/v1';
 const client=async(url,opts={})=>{
   const text=String(url);
   if(text.includes('/product/listV2')) return {data:{content:[{productList:[
     {id:'p1',nameEn:'Bottle Gap Cleaner Brush',saleStatus:'3',sellPrice:1,totalVerifiedInventory:100},
     {id:'p2',nameEn:'Crevice Gap Cleaning Brush',saleStatus:'3',sellPrice:2,totalVerifiedInventory:80},
   ]}]}};
   if(text.includes('/product/variant/query')&&text.includes('pid=p1')) return {data:[{vid:'v1',variantSku:'S1',variantSellPrice:1}]};
   if(text.includes('/product/variant/query')&&text.includes('pid=p2')) return {data:[{vid:'v2',variantSku:'S2',variantSellPrice:2}]};
   if(text.includes('/product/stock/queryByVid')&&text.includes('vid=v1')) return {data:[{vid:'v1',countryCode:'US',totalInventoryNum:100,cjInventoryNum:50}]};
   if(text.includes('/product/stock/queryByVid')&&text.includes('vid=v2')) return {data:[{vid:'v2',countryCode:'US',totalInventoryNum:100,cjInventoryNum:40}]};
   if(text.endsWith('/logistic/freightCalculate')) {
     const body=JSON.parse(opts.body||'{}');
     const vid=body.products?.[0]?.vid;
     const qty=body.products?.[0]?.quantity;
     const price=vid==='v1' ? 9*qty : 3*qty;
     return {data:[{logisticName:'Carrier',logisticPrice:price,logisticAging:'4-8'}]};
   }
   throw new Error('unexpected '+text);
 };
 const result=await sourceCandidate({client,base,token:'t',candidate});
 assert.equal(result.product.id,'p2');
 assert.equal(result.selectedSupplierRank,2);
 assert.equal(result.selectionBasis,'lowest_screened_single_unit_landed_cost_then_origin_and_inventory');
 assert.equal(result.supplierRoutePortfolio[0].screenedSingleUnitLandedUsd,5);
 assert.equal(result.supplierRoutePortfolio[1].screenedSingleUnitLandedUsd,10);
});

test('multi-pack screening amortizes priced freight without claiming destination verification',()=>{
 const pack=buildPackScreening(1.79,5,{offers:[{name:'Carrier',usd:11.5,aging:'3-8'}]});
 assert.equal(pack.priced,true);
 assert.equal(pack.productCostTotalUsd,8.95);
 assert.equal(pack.freightPerUnitUsd,2.3);
 assert.equal(pack.landedCostUsd,20.45);
 assert.equal(pack.landedCostPerUnitUsd,4.09);
 assert.equal(pack.finalDestinationVerified,false);
});

test('pack screening fails closed without positive freight',()=>{
 assert.equal(buildPackScreening(1.79,3,{offers:[]}).priced,false);
 assert.equal(buildPackScreening(1.79,0,{offers:[{usd:4}]}).priced,false);
});

test('keeps top two anchors while rotating remaining supplier slots',()=>{
 const candidates=Array.from({length:8},(_,i)=>({slug:`p${i+1}`}));
 const a=selectRotatingCandidates(candidates,{batchSize:5,anchorCount:2,slot:0});
 const b=selectRotatingCandidates(candidates,{batchSize:5,anchorCount:2,slot:3});
 assert.deepEqual(a.selected.map(x=>x.slug),['p1','p2','p3','p4','p5']);
 assert.deepEqual(b.selected.map(x=>x.slug),['p1','p2','p6','p7','p8']);
 assert.equal(a.selected.length,5);
 assert.equal(b.selected.length,5);
});

test('rotation wraps without duplicates and eventually covers the full queue',()=>{
 const candidates=Array.from({length:9},(_,i)=>({slug:`p${i+1}`}));
 const seen=new Set();
 for(let slot=0;slot<7;slot+=1){
   const batch=selectRotatingCandidates(candidates,{batchSize:5,anchorCount:2,slot});
   assert.equal(new Set(batch.selected.map(x=>x.slug)).size,batch.selected.length);
   for(const row of batch.selected) seen.add(row.slug);
 }
 assert.equal(seen.size,9);
});
