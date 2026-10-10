import fs from 'node:fs/promises';

const CONTROL='growth-reports/ebay/control-plane.json';
const OUTDIR='growth-reports/ebay';

function clean(v,max=240){return String(v??'').trim().slice(0,max)}
function missingEnv(names){return names.filter(n=>!clean(process.env[n],4000))}

async function main(){
  const c=JSON.parse(await fs.readFile(CONTROL,'utf8'));
  const gates=c.gates||{};
  const blockers=Object.entries(gates).filter(([,v])=>v!==true).map(([k])=>k);
  const requiredEbaySecrets=['EBAY_CLIENT_ID','EBAY_CLIENT_SECRET','EBAY_REFRESH_TOKEN'];
  const policySecrets=['EBAY_PAYMENT_POLICY_ID','EBAY_RETURN_POLICY_ID','EBAY_FULFILLMENT_POLICY_ID','EBAY_MERCHANT_LOCATION_KEY'];
  const missingOAuth=missingEnv(requiredEbaySecrets);
  const missingPolicies=missingEnv(policySecrets);
  const apiConnectorReady=missingOAuth.length===0&&missingPolicies.length===0;
  let phase='BLOCKED';
  let nextAction='';
  if(c.readyForBrowserPublish===true){
    phase=apiConnectorReady?'READY_API':'READY_BROWSER';
    nextAction=apiConnectorReady
      ? 'Run the eBay Inventory API connector in create/offer mode. Publish only after its dry-run and policy checks pass.'
      : 'Use the PrismBay local agent for final eBay review. API connector remains dormant until legitimate eBay OAuth and business-policy credentials exist.';
  }else if(blockers.length===1&&blockers[0]==='ebaySellerAuthenticated'){
    phase='WAITING_EBAY_CJ_AUTH';
    nextAction='Keep CJ/eBay authorization watcher active and keep the zero-cost local authorization runner published. No listing publish until CJ reports the eBay shop authorized.';
  }else{
    nextAction=`Resolve blockers: ${blockers.join(', ')||'unknown'}`;
  }
  const state={
    schemaVersion:1,
    checkedAt:new Date().toISOString(),
    phase,
    readyForBrowserPublish:c.readyForBrowserPublish===true,
    blockers,
    controlPlaneCheckedAt:c.checkedAt||null,
    ebayShopCount:Number(c?.cj?.ebayShopCount||0),
    ebaySellerAuthenticated:gates.ebaySellerAuthenticated===true,
    liveStockVerified:gates.liveStockVerified===true,
    dispatchLocationVerified:gates.dispatchLocationVerified===true,
    economicsPass:gates.economicsPass===true&&gates.offerFloorEconomicsPass===true,
    warehouse:c?.cj?.warehouse?{
      id:clean(c.cj.warehouse.id,120),city:clean(c.cj.warehouse.city,80),province:clean(c.cj.warehouse.province,80),countryCode:clean(c.cj.warehouse.countryCode,10),address1:clean(c.cj.warehouse.address1,320)
    }:null,
    ebayApi:{
      connectorImplemented:true,
      connectorReady:apiConnectorReady,
      missingOAuthSecrets:missingOAuth,
      missingBusinessPolicySecrets:missingPolicies,
      publishEnabled:process.env.EBAY_AUTOPUBLISH==='1'
    },
    nextAction
  };
  const body=[
    '# PrismBay eBay Autonomous Orchestrator',
    '',
    `**Phase:** ${phase}`,
    `**Checked:** ${state.checkedAt}`,
    `**CJ eBay authorized:** ${state.ebaySellerAuthenticated?'YES':'NO'}`,
    `**Live stock:** ${state.liveStockVerified?'YES':'NO'}`,
    `**Dispatch location:** ${state.dispatchLocationVerified?'YES':'NO'}`,
    `**Economics:** ${state.economicsPass?'PASS':'BLOCKED'}`,
    `**Ready for final eBay review:** ${state.readyForBrowserPublish?'YES':'NO'}`,
    '',
    `**Current blockers:** ${blockers.length?blockers.join(', '):'none'}`,
    '',
    `**eBay API connector:** ${apiConnectorReady?'credentials + policy IDs present':'implemented but fail-closed'}`,
    missingOAuth.length?`**Missing OAuth secrets:** ${missingOAuth.join(', ')}`:'**OAuth secrets:** present',
    missingPolicies.length?`**Missing policy/location secrets:** ${missingPolicies.join(', ')}`:'**Policy/location secrets:** present',
    '',
    `**Next action:** ${nextAction}`,
    '',
    'This issue is maintained automatically. No supplier order, payment, payout/banking change, or off-eBay checkout is performed by this orchestrator.'
  ].join('\n');
  await fs.mkdir(OUTDIR,{recursive:true});
  await fs.writeFile(`${OUTDIR}/orchestrator-state.json`,JSON.stringify(state,null,2)+'\n');
  await fs.writeFile(`${OUTDIR}/orchestrator-issue.md`,body+'\n');
  console.log(JSON.stringify({phase,blockers,apiConnectorReady,nextAction}));
}
main().catch(e=>{console.error(e?.stack||e);process.exit(1)});
