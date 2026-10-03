import test from 'node:test';
import assert from 'node:assert/strict';
import { bridgeFirstSaleRescue } from './first-sale-rescue-task-bridge.mjs';

test('injects recommended and parallel rescue actions into correct company queues',()=>{
  const taskboard={schemaVersion:1,tasks:[{id:'base',companyId:'commerce-control'}],companies:{'commerce-control':[],'offer-engineering':[],'supplier-fulfillment':[]}};
  const rescueBoard={primaryProduct:'crevice',recommendedAction:{id:'price_rescue',owner:'offer-engineering',action:'prepare_measured_threshold_price_test',frictionScore:40,evidenceStrength:'verified_cost_floor_hypothesis',context:{}},parallelActions:[{id:'supplier_rescue',owner:'supplier-fulfillment',action:'continue_replacement_supplier_search',frictionScore:60,evidenceStrength:'route_deficit_only',context:{}}]};
  const out=bridgeFirstSaleRescue({taskboard,rescueBoard});
  assert.equal(out.firstSaleRescue.recommendedAction,'price_rescue');
  assert.ok(out.companies['offer-engineering'].some(x=>x.id.includes('price_rescue')));
  assert.ok(out.companies['supplier-fulfillment'].some(x=>x.id.includes('supplier_rescue')));
  assert.equal(out.tasks.find(x=>x.id.includes('price_rescue')).priority,1);
});

test('bridge is idempotent by task id',()=>{
  const rescueBoard={primaryProduct:'x',recommendedAction:{id:'product_switch_rescue',owner:'commerce-control',action:'switch',frictionScore:30,evidenceStrength:'portfolio_backup_candidate',context:{}},parallelActions:[]};
  const once=bridgeFirstSaleRescue({taskboard:{tasks:[],companies:{}},rescueBoard});
  const twice=bridgeFirstSaleRescue({taskboard:once,rescueBoard});
  assert.equal(twice.totalTasks,once.totalTasks);
});
