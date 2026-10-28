import test from 'node:test';
import assert from 'node:assert/strict';
import {readiness} from './hypersku-github-bridge.mjs';
test('vendor not approved: never sync or charge even with configuration',()=>{
 const x=readiness({apiStatus:'account_and_open_api_access_pending'},true);
 assert.equal(x.status,'awaiting_vendor_approval');
 assert.equal(x.productSyncEnabled,false);
 assert.equal(x.physicalCheckoutEnabled,false);
 assert.equal(x.supplierOrdersEnabled,false);
 assert.equal(x.authenticatedApiVerified,false);
 assert.equal(x.supplierConnected,false);
 assert.equal(x.authenticationEvidence,'not_performed');
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

test('registry approval and configured secret never imply an authenticated supplier connection',()=>{
 const x=readiness({apiStatus:'api_active',approvedApiDocumentation:true},true);
 assert.equal(x.apiApproved,true,'Registry approval is only a declared flag');
 assert.equal(x.credentialsPresent,true,'A configured key is not proof of validity');
 assert.equal(x.authenticatedApiVerified,false);
 assert.equal(x.supplierConnected,false);
 assert.equal(x.authenticationEvidence,'not_performed');
 assert.equal(x.status,'integration_configuration_review_required');
 assert.equal(x.productSyncEnabled,false);
 assert.equal(x.physicalCheckoutEnabled,false);
 assert.equal(x.supplierOrdersEnabled,false);
});

test('serialized readiness never echoes raw credentials or private provider fields',()=>{
 const dummyCredential='FAKE_TEST_CREDENTIAL_NOT_REAL_123';
 const dummyProviderKey='FAKE_PROVIDER_KEY_NOT_REAL_456';
 const x=readiness({
  apiStatus:'api_active',approvedApiDocumentation:true,
  apiKey:dummyProviderKey,customerEmail:'sample@example.invalid',
  shippingAddress:'FAKE_PRIVATE_ADDRESS_NOT_REAL'
 },dummyCredential);
 assert.equal(x.credentialsPresent,true);
 assert.equal(typeof x.credentialsPresent,'boolean');
 const artifact=JSON.stringify(x);
 for(const sensitive of [dummyCredential,dummyProviderKey,'sample@example.invalid','FAKE_PRIVATE_ADDRESS_NOT_REAL']){
  assert.equal(artifact.includes(sensitive),false,'No private value may enter a retained artifact');
 }
 assert.equal(x.authenticatedApiVerified,false);
 assert.equal(x.supplierConnected,false);
 assert.equal(x.productSyncEnabled,false);
 assert.equal(x.physicalCheckoutEnabled,false);
 assert.equal(x.supplierOrdersEnabled,false);
});

test('confirmed low-volume manual CSV route never implies API or order authorization',()=>{
 const x=readiness({apiStatus:'open_api_not_available_low_volume',customStoreRoute:'manual_csv_batch_upload_only'},false);
 assert.equal(x.status,'manual_csv_research_only');
 assert.equal(x.manualCsvResearchAvailable,true);
 assert.equal(x.apiApproved,false);
 assert.equal(x.authenticatedApiVerified,false);
 assert.equal(x.supplierConnected,false);
 assert.equal(x.manualCsvSubmissionAuthorized,false);
 assert.equal(x.manualCsvOrdersEnabled,false);
 assert.equal(x.physicalCheckoutEnabled,false);
 assert.equal(x.supplierMediaReuseEnabled,false);
});
