import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function buildSurfaceRemediation(audit={}) {
  const tasks=[];
  const productIssues=Array.isArray(audit.products?.products)?audit.products.products.filter(x=>Array.isArray(x.issues)&&x.issues.length):[];
  if(productIssues.some(x=>x.issues.includes('missing_id'))){
    tasks.push({
      id:'products-json-stable-ids',
      priority:1,
      owner:'storefront-conversion',
      title:'Add stable unique IDs to every product in products.json',
      evidence:`${productIssues.filter(x=>x.issues.includes('missing_id')).length} products currently lack stable IDs`,
      definitionOfDone:'commerce surface audit reports productCount > 0, invalidProductCount = 0, duplicateIds = [] and no product:*:missing_id issues',
      safeImplementation:'Use persistent slug/SKU-like IDs matching each product route; do not alter price, fulfillment, availability or claims while fixing identity.',
    });
  }
  if(Array.isArray(audit.merchant?.issues)&&audit.merchant.issues.length){
    tasks.push({id:'merchant-feed-repair',priority:1,owner:'organic-growth',title:'Repair merchant feed structural defects',evidence:audit.merchant.issues,definitionOfDone:'merchant.valid = true with at least one item and required title, price and link fields',safeImplementation:'Repair machine-readable structure only; platform approval remains separately gated.'});
  }
  if(Array.isArray(audit.sitemap?.issues)&&audit.sitemap.issues.length){
    tasks.push({id:'sitemap-repair',priority:2,owner:'organic-growth',title:'Repair sitemap discoverability defects',evidence:audit.sitemap.issues,definitionOfDone:'sitemap.valid = true and sitemap contains HTTPS product/discovery URLs',safeImplementation:'Do not add blocked or unverified commercial routes solely to increase URL count.'});
  }
  if(Array.isArray(audit.robots?.issues)&&audit.robots.issues.length){
    tasks.push({id:'robots-repair',priority:1,owner:'storefront-conversion',title:'Repair robots discoverability defects',evidence:audit.robots.issues,definitionOfDone:'robots.valid = true, site is not blanket-blocked and sitemap reference is present',safeImplementation:'Preserve any intentional sensitive-path restrictions.'});
  }
  if(audit.legacyExposure?.safe===false){
    tasks.push({
      id:'legacy-storefront-commercial-exposure',
      priority:0,
      owner:'storefront-trust',
      title:'Suspend legacy physical checkout and unsupported product-feed claims',
      evidence:{
        checkoutLinks:audit.legacyExposure.directCheckoutLinkCount??null,
        saleSchemaPages:audit.legacyExposure.saleSchemaPageCount??null,
        inStockFeedRows:audit.legacyExposure.inStockFeedRowCount??null,
        issues:audit.legacyExposure.issues||[]
      },
      definitionOfDone:'Owner deactivates legacy physical payment links in the correct Stripe merchant and retires or corrects the legacy AppDeploy storefront, then read-only audit confirms no checkout links, unverified Product/Offer schema, unsupported stock claims or unlicensed media.',
      safeImplementation:'Do not change Stripe, delete the deployed app, publish supplier media or modify paid offers automatically. Preserve unrelated verified digital offers.'
    });
  }
  return {
    schemaVersion:1,
    generatedAt:new Date().toISOString(),
    technicalSurfaceReady:audit.technicalSurfaceReady===true,
    issueCount:Number(audit.issueCount||0),
    activeTaskCount:tasks.length,
    tasks,
    nextAction:tasks.sort((a,b)=>a.priority-b.priority)[0]?.title||'Protect current technical commerce surface and continue monitoring.',
    rule:'Technical remediation cannot manufacture marketplace approval, customer demand, traffic, sales or revenue.',
  };
}

export async function main(){
  const audit=JSON.parse(await fs.readFile('growth-reports/commerce-surface-audit.json','utf8'));
  const board=buildSurfaceRemediation(audit);
  await fs.writeFile('growth-reports/commerce-surface-remediation.json',JSON.stringify(board,null,2)+'\n');
  console.log(JSON.stringify({technicalSurfaceReady:board.technicalSurfaceReady,activeTaskCount:board.activeTaskCount,nextAction:board.nextAction},null,2));
  return board;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) await main();
