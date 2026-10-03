import crypto from 'node:crypto';

const SAFE_STAGE=new Set(['quote','checkout']);
function safeSku(value){const sku=String(value||'').trim();return /^[A-Za-z0-9._-]{1,80}$/.test(sku)?sku:'unknown';}
function safeCode(value){const code=String(value||'').trim().toLowerCase();return /^[a-z0-9_]{1,80}$/.test(code)?code:'unknown_failure';}
function safeEqual(a,b){const left=Buffer.from(String(a||'')),right=Buffer.from(String(b||''));return left.length===right.length&&left.length>0&&crypto.timingSafeEqual(left,right);}

export function signalTokenAuthorized(expected,provided){return String(expected||'').length>=32&&safeEqual(expected,provided);}

export function createCommercialSignalRecorder({ledger,now=()=>Date.now(),minimumPersistIntervalMs=60_000}={}){
  if(!ledger?.transact||!ledger?.snapshot)throw new Error('ledger required');
  const lastPersisted=new Map();
  async function record({stage,sku,code}={}){
    const normalizedStage=SAFE_STAGE.has(stage)?stage:null;
    if(!normalizedStage)return false;
    const normalizedSku=safeSku(sku),normalizedCode=safeCode(code);
    const key=`${normalizedStage}:${normalizedSku}:${normalizedCode}`;
    const timestamp=Number(now());
    if(!Number.isFinite(timestamp))return false;
    const previous=lastPersisted.get(key)||0;
    if(timestamp-previous<minimumPersistIntervalMs)return false;
    lastPersisted.set(key,timestamp);
    await ledger.transact(state=>{
      if(!state.commercialSignals||state.commercialSignals.version!==1)state.commercialSignals={version:1,counters:{}};
      const current=state.commercialSignals.counters[key]||{stage:normalizedStage,sku:normalizedSku,error:normalizedCode,count:0,lastSeenAt:null};
      state.commercialSignals.counters[key]={...current,count:Number(current.count||0)+1,lastSeenAt:new Date(timestamp).toISOString()};
      const entries=Object.entries(state.commercialSignals.counters);
      if(entries.length>200){
        entries.sort((a,b)=>Date.parse(a[1].lastSeenAt||0)-Date.parse(b[1].lastSeenAt||0));
        for(const [oldKey] of entries.slice(0,entries.length-200))delete state.commercialSignals.counters[oldKey];
      }
    });
    return true;
  }
  function summary(){
    const state=ledger.snapshot();
    const counters=state.commercialSignals?.version===1?state.commercialSignals.counters||{}:{};
    const events=Object.values(counters).map(row=>({stage:row.stage,sku:row.sku,error:row.error,count:Number(row.count||0),lastSeenAt:row.lastSeenAt||null})).sort((a,b)=>Date.parse(b.lastSeenAt||0)-Date.parse(a.lastSeenAt||0));
    return {schemaVersion:1,privacy:'aggregate_no_zip_email_ip_token_or_payment_data',eventType:'commercial_failure_summary',eventCount:events.reduce((n,e)=>n+e.count,0),events};
  }
  return Object.freeze({record,summary});
}
