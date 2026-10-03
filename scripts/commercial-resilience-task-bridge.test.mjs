import test from 'node:test';
import assert from 'node:assert/strict';
import { bridgeResilience } from './commercial-resilience-task-bridge.mjs';

test('resilience work is injected into supplier, offer, experiment, checkout and inventory-risk owners', () => {
  const taskboard = { schemaVersion:1, tasks:[{id:'base',companyId:'commerce-control',title:'base'}], companies:{'commerce-control':[]} };
  const supplierBoard = { targetVerifiedRoutesPerSku:3, highRiskProducts:[{slug:'crevice'}], routePromotionProposals:[{slug:'crevice'}], products:[{slug:'crevice',supplierRouteDeficit:2,supplierConcentrationRisk:'high',promotionProposal:{status:'proposal_only'}}] };
  const offerBoard = { hypothesisCount:3, products:[{slug:'crevice',viableHypotheses:[{hypothesis:'single'}],recommendedTestSequence:['single'],elasticityStatus:'unmeasured',measurementRequired:['paid_conversion_rate']}] };
  const recoveryBoard = { tasks:[{id:'r1',owner:'supplier-fulfillment',sku:'crevice',failureCode:'stock_changed_since_quote',alternativeVerifiedRoutes:1,doneWhen:'restored'}] };
  const inventoryBoard = { minimumPrimaryInventory:5, fragileProductCount:1, products:[{slug:'crevice',fragilePrimary:true,inventoryRisk:'critical',maxVerifiedRouteInventory:1,totalVerifiedInventoryAcrossRoutes:1,requiredAction:'accelerate_backup_supplier_and_backup_product_work'}] };
  const output = bridgeResilience({taskboard,supplierBoard,offerBoard,recoveryBoard,inventoryBoard});
  assert.ok(output.totalTasks >= 8);
  assert.ok(output.companies['supplier-fulfillment'].some(x=>x.title.includes('Reduce supplier concentration')));
  assert.ok(output.companies['supplier-fulfillment'].some(x=>x.title.includes('Recover inventory depth')));
  assert.ok(output.companies['commerce-control'].some(x=>x.title.includes('Protect first-sale plan')));
  assert.ok(output.companies['offer-engineering'].some(x=>x.title.includes('price and bundle tournament')));
  assert.ok(output.companies['experiment-lab'].some(x=>x.title.includes('elasticity experiment')));
  assert.ok(output.companies['supplier-fulfillment'].some(x=>x.title.includes('Recover checkout failure')));
  assert.equal(output.commercialResilience.checkoutRecoveryTasks,1);
  assert.equal(output.commercialResilience.fragileInventoryProducts,1);
});

test('bridge is idempotent by task id', () => {
  const taskboard={tasks:[],companies:{}};
  const supplierBoard={products:[{slug:'x',supplierRouteDeficit:1,supplierConcentrationRisk:'high'}]};
  const once=bridgeResilience({taskboard,supplierBoard,offerBoard:{},recoveryBoard:{},inventoryBoard:{}});
  const twice=bridgeResilience({taskboard:once,supplierBoard,offerBoard:{},recoveryBoard:{},inventoryBoard:{}});
  assert.equal(twice.totalTasks,once.totalTasks);
});
