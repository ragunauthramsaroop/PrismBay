import test from 'node:test';
import assert from 'node:assert/strict';
import {readiness} from './hypersku-github-bridge.mjs';
test('vendor not approved: never sync or charge even with configuration',()=>{
 const x=readiness({apiStatus:'account_and_open_api_access_pending'},true);
 assert.equal(x.status,'awaiting_vendor_approval');
 assert.equal(x.productSyncEnabled,false);
 assert.equal(x.physicalCheckoutEnabled,false);
 assert.equal(x.supplierOrdersEnabled,false);
});
test('vendor approval without documentation is still blocked',()=>{
 const x=readiness({apiStatus:'api_active'},true);
 assert.equal(x.status,'awaiting_vendor_api_docs');
});
test('documents provided without private credentials cannot proceed',()=>{
 const x=readiness({apiStatus:'api_active',approvedApiDocumentation:true},false);
 assert.equal(x.status,'awaiting_private_configuration');
});
test('configured secrets do not independently authorize stock, media or physical checkout',()=>{
 const x=readiness({apiStatus:'api_active',approvedApiDocumentation:true},true);
 assert.equal(x.status,'integration_configuration_review_required');
 assert.equal(x.productSyncEnabled,false);
 assert.equal(x.supplierMediaReuseEnabled,false);
 assert.equal(x.physicalCheckoutEnabled,false);
 assert.equal(x.supplierOrdersEnabled,false);
});
