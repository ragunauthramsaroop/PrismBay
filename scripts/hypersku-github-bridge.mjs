import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function readiness(provider,credentialConfigured) {
 const hasApprovedApi = provider?.apiStatus === 'api_active';
 const manualCsvResearchOnly = provider?.apiStatus === 'open_api_not_available_low_volume' && provider?.customStoreRoute === 'manual_csv_batch_upload_only';
 const hasDocs = provider?.approvedApiDocumentation === true;
 // Keep only a boolean in the retained artifact, even if a caller passes a raw key.
 const hasPrivateConfiguration = Boolean(credentialConfigured);
 return {
  provider:'hypersku', apiApproved:hasApprovedApi,
  manualCsvResearchAvailable:manualCsvResearchOnly,
  manualCsvSubmissionAuthorized:false, manualCsvOrdersEnabled:false,
  documentationApproved:hasDocs,
  credentialsPresent:hasPrivateConfiguration,
  // Registry flags and a configured key are not an authenticated provider API call.
  authenticatedApiVerified:false,
  supplierConnected:false,
  authenticationEvidence:'not_performed',
  status:manualCsvResearchOnly?'manual_csv_research_only':!hasApprovedApi?'awaiting_vendor_approval':!hasDocs?'awaiting_vendor_api_docs':!hasPrivateConfiguration?'awaiting_private_configuration':'integration_configuration_review_required',
  productSyncEnabled:false, physicalCheckoutEnabled:false,
  supplierOrdersEnabled:false, supplierMediaReuseEnabled:false
 };
}
export async function run() {
 const config=JSON.parse(await fs.readFile('config/alternate-supplier-evidence.json','utf8'));
 const report={...readiness(config.providers.hypersku,Boolean(process.env.HYPERSKU_API_KEY)),checkedAt:new Date().toISOString()};
 await fs.mkdir('growth-reports',{recursive:true});
 await fs.writeFile('growth-reports/hypersku-github-bridge.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,productSyncEnabled:false,ordersEnabled:false}));
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
