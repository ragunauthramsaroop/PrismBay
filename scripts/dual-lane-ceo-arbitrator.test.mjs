import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDualLaneBoard, injectDualLaneTasks } from './dual-lane-ceo-arbitrator.mjs';

test('separates checkout-near product from strongest distinct commercial contender',()=>{
 const board=buildDualLaneBoard({dashboard:{closestProduct:'crevice',remainingGates:['final_zip_freight','checkout']},tournament:{productTournament:[{slug:'garment-steamer'},{slug:'crevice'},{slug:'pethair'}]},rescue:{recommendedAction:{id:'price_rescue'},parallelActions:[{id:'supplier_rescue'}]},growth:{primaryProduct:'crevice'},supplierBoard:{products:[{slug:'crevice',operationallyVerifiedRouteCount:1,promotableRouteCount:0},{slug:'garment-steamer',operationallyVerifiedRouteCount:1,promotableRouteCount:1}]}});
 assert.equal(board.checkoutLane.product,'crevice');
 assert.equal(board.commercialLane.product,'garment-steamer');
 assert.equal(board.divergence,true);
 assert.equal(board.checkoutLane.rescueAction,'price_rescue');
 assert.equal(board.commercialLane.promotableRoutes,1);
});

test('commercial lane selects a distinct ranked product even if checkout product leads tournament',()=>{
 const board=buildDualLaneBoard({dashboard:{closestProduct:'crevice'},tournament:{productTournament:[{slug:'crevice'},{slug:'pethair'}]},growth:{productRace:[{slug:'crevice'},{slug:'pethair'}]}});
 assert.equal(board.checkoutLane.product,'crevice');
 assert.equal(board.commercialLane.product,'pethair');
 assert.equal(board.divergence,true);
});

test('injects measurable work for both lanes and remains idempotent',()=>{
 const board={divergence:true,checkoutLane:{product:'crevice',remainingGates:['checkout']},commercialLane:{product:'garment-steamer'}};
 const once=injectDualLaneTasks({tasks:[],companies:{}},board);
 const twice=injectDualLaneTasks(once,board);
 assert.ok(once.companies['commerce-control'].some(x=>x.id.includes('checkout:crevice')));
 assert.ok(once.companies['product-intelligence'].some(x=>x.id.includes('commercial:garment-steamer')));
 assert.equal(twice.totalTasks,once.totalTasks);
});

test('fails closed without inventing lane products',()=>{
 const board=buildDualLaneBoard({});
 assert.equal(board.checkoutLane.product,null);
 assert.equal(board.commercialLane.product,null);
 assert.equal(board.divergence,false);
});
