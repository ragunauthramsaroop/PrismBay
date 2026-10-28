import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function readiness(provider,credentialConfigured) {
 const hasApprovedApi = provider?.apiStatus === 'api_active';
 const hasDocs = provider?.approvedApiDocumentation === true;
 return {
  provider:'hypersku', apiApproved:hasApprovedApi,
  documentationApproved:hasDocs,
  credentialsPresent:credentialConfigured,
  status:!hasApprovedApi?'awaiting_vendor_approval':!hasDocs?'awaiting_vendor_api_docs':!credentialConfigured?'awaiting_private_configuration':'integration_configuration_review_required',
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
