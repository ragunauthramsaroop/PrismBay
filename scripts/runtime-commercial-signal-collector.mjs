import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function safeUrl(value){try{const u=new URL(String(value||''));return u.protocol==='https:'?u:null;}catch{return null;}}
function safeSku(value){const sku=String(value||'').trim();return /^[A-Za-z0-9._-]{1,80}$/.test(sku)?sku:'unknown';}
function safeCode(value){const code=String(value||'').trim().toLowerCase();return /^[a-z0-9_]{1,80}$/.test(code)?code:'unknown_failure';}
function safeStage(value){return ['quote','checkout'].includes(value)?value:'unknown';}

export function normalizeSignalSummary(payload={}){
 const rows=Array.isArray(payload?.events)?payload.events:[];
 const events=[];
 for(const row of rows.slice(0,200)){
   const count=Number(row?.count||0);
   const lastSeenAt=Date.parse(row?.lastSeenAt||'');
   if(!Number.isFinite(count)||count<1||!Number.isFinite(lastSeenAt))continue;
   events.push({stage:safeStage(row.stage),sku:safeSku(row.sku),error:safeCode(row.error),count:Math.min(Math.floor(count),100000),lastSeenAt:new Date(lastSeenAt).toISOString()});
 }
 events.sort((a,b)=>Date.parse(b.lastSeenAt)-Date.parse(a.lastSeenAt));
 return {schemaVersion:1,checkedAt:new Date().toISOString(),source:'authenticated_runtime_commercial_signal_summary',privacy:'aggregate_no_zip_email_ip_token_or_payment_data',eventCount:events.reduce((n,e)=>n+e.count,0),events};
}

export async function collectRuntimeSignals({url,token,fetchImpl=globalThis.fetch}={}){
 const endpoint=safeUrl(url);
 if(!endpoint||String(token||'').length<32)return{configured:false,evidence:normalizeSignalSummary({events:[]})};
 const response=await fetchImpl(endpoint,{headers:{'x-commercial-signal-token':String(token),'accept':'application/json','user-agent':'PrismBay-Paperclip-Runtime-Signal-Collector/1.0'}});
 if(!response?.ok)throw new Error(`runtime_signal_http_${response?.status||'error'}`);
 const payload=await response.json();
 if(payload?.privacy!=='aggregate_no_zip_email_ip_token_or_payment_data'||payload?.eventType!=='commercial_failure_summary')throw new Error('runtime_signal_schema_rejected');
 return{configured:true,evidence:normalizeSignalSummary(payload)};
}

export async function main(){
 const {configured,evidence}=await collectRuntimeSignals({url:process.env.COMMERCIAL_SIGNAL_URL,token:process.env.COMMERCIAL_SIGNAL_READ_TOKEN});
 await fs.mkdir('growth-reports',{recursive:true});
 await fs.writeFile('growth-reports/checkout-failure-evidence.json',JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify({configured,eventCount:evidence.eventCount,distinctFailures:evidence.events.length},null,2));
 return evidence;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
