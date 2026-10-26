// Cloud-only read-only Zernio connection health: no publishing, no private response logs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUTPUT=path.join(ROOT,'build','tiktok-account-health.json');
const BASE='https://zernio.com/api/v1/accounts';

export function findAccount(tree,id,seen=new Set()){
  if(!tree || typeof tree!=='object' || seen.has(tree))return null;
  seen.add(tree);
  if(Array.isArray(tree)){
    for(const x of tree){const r=findAccount(x,id,seen);if(r)return r;}
    return null;
  }
  const key=tree._id??tree.id??tree.accountId;
  if(key===id && String(tree.platform??'').toLowerCase()==='tiktok')return tree;
  for(const value of Object.values(tree)){const r=findAccount(value,id,seen);if(r)return r;}
  return null;
}
export function assessAccount(data,config){
  const account=findAccount(data,config.account.id);
  if(!account)return {connected:false,reason:'configured_tiktok_account_not_found'};
  const name=account.username??account.metadata?.profileData?.username;
  if(name && String(name).toLowerCase()!==config.account.username.toLowerCase())
    return {connected:false,reason:'tiktok_account_username_mismatch'};
  return {connected:true,reason:'configured_tiktok_account_found',username:config.account.username};
}
export async function readOnlyPreflight({env=process.env,fetchImpl=fetch}={}){
  const [config,lock]=await Promise.all([
    fs.readFile(path.join(ROOT,'config/tiktok-publish.json'),'utf8').then(JSON.parse),
    fs.readFile(path.join(ROOT,'config/tiktok-publish-lock.json'),'utf8').then(JSON.parse)
  ]);
  const report={schemaVersion:1,checkedAt:new Date().toISOString(),
    provider:'zernio',expectedUsername:config.account.username,
    lockActive:lock.locked===true,postAttempted:false,
    connected:false,publishingReady:false,reason:'not_checked'};
  if(!env.ZERNIO_API_KEY){report.reason='missing_github_actions_zernio_api_key';return report;}
  try{
    const response=await fetchImpl(BASE,{method:'GET',headers:{
      'Authorization':'Bearer '+env.ZERNIO_API_KEY,
      'Accept':'application/json'
    },redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!response.ok){report.reason='zernio_http_'+response.status;return report;}
    const data=await response.json();
    const check=assessAccount(data,config);
    report.connected=check.connected;
    report.reason=check.reason;
  }catch{report.reason='zernio_network_or_parse_failure';}
  return report;
}
export async function main(){
  const report=await readOnlyPreflight();
  await fs.mkdir(path.dirname(OUTPUT),{recursive:true});
  await fs.writeFile(OUTPUT,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report)); // no tokens, arbitrary provider payload or third-party IDs
  return report;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
