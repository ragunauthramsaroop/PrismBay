import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInventoryDepthBoard } from './inventory-depth-guard.mjs';

test('flags one-unit route as strategically fragile without calling it unavailable',()=>{
 const board=buildInventoryDepthBoard({supplierBoard:{products:[{slug:'crevice',routes:[{inventory:1,variantInventoryVerified:true,screeningFreightVerified:true}]}]}});
 assert.equal(board.fragileProductCount,1);
 assert.equal(board.products[0].fragilePrimary,true);
 assert.equal(board.products[0].inventoryRisk,'critical');
 assert.match(board.products[0].rule,/does not.*block/i);
});

test('multiple adequately stocked routes clear fragility',()=>{
 const board=buildInventoryDepthBoard({supplierBoard:{products:[{slug:'x',routes:[{inventory:10,variantInventoryVerified:true,screeningFreightVerified:true},{inventory:4,variantInventoryVerified:true,screeningFreightVerified:true}]}]}});
 assert.equal(board.products[0].fragilePrimary,false);
 assert.equal(board.products[0].viableRouteCountAtBackupFloor,2);
});
