import fs from 'node:fs/promises';

const BASE='https://developers.cjdropshipping.com/api2.0/v1';
const TARGET_NO='T202610101508010581';
const TARGET_ID='2610101508010810500';
const MARKER='PRISMBAY_EBAY_20261010';
const SKU='CJYD245844002BY';
const OUT='growth-reports/ebay/cj-ticket-watch.json';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const clean=(v,n=240)=>String(v??'').trim().slice(0,n);

async function fetchJson(url,options={}){
  const r=await fetch(url,{...options,signal:AbortSignal.timeout(15000)});
  const text=await r.text();
  let body={};
  try{body=JSON.parse(text)}catch{throw new Error(`non_json_${r.status}`)}
  if(!r.ok||body?.result===false||body?.success===false)throw new Error(`cj_${r.status}_${body?.code??'unknown'}_${body?.message??'error'}`);
  return body;
}

async function auth(apiKey){
  let r;
  for(let i=1;i<=4;i++){
    r=await fetch(`${BASE}/authentication/getAccessToken`,{method:'POST',headers:{'content-type':'application/json','user-agent':'PrismBay-eBay-Reply-Watch/1.0'},body:JSON.stringify({apiKey}),signal:AbortSignal.timeout(15000)});
    if(r.status!==429)break;
    await wait(1500*i);
  }
  if(!r?.ok)throw new Error(`CJ authentication failed: ${r?.status}`);
  const b=await r.json();
  const token=clean(b?.data?.accessToken,1200);
  if(!token)throw new Error('CJ token missing');
  console.log(`::add-mask::${token}`);
  return token;
}

const headers=token=>({'CJ-Access-Token':token,'content-type':'application/json','user-agent':'PrismBay-eBay-Reply-Watch/1.0'});

function epoch(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:null;}
function statusFrom(detail,row){return clean(detail?.status??row?.status??'UNKNOWN',80);}
function keysOnly(value){return value&&typeof value==='object'?Object.keys(value).sort().slice(0,80):[];}

async function main(){
  const key=clean(process.env.CJ_API_KEY,500);
  if(!key)throw new Error('CJ_API_KEY missing');
  const token=await auth(key);
  await wait(1100);
  const listPayload=await fetchJson(`${BASE}/ticket/list`,{method:'POST',headers:headers(token),body:JSON.stringify({pageNum:1,pageSize:30})});
  const rows=Array.isArray(listPayload?.data?.list)?listPayload.data.list:[];
  let row=rows.find(x=>clean(x?.ticketNo,100)===TARGET_NO||clean(x?.ticketId,100)===TARGET_ID)||null;
  if(!row){
    for(const candidate of rows.slice(0,12)){
      await wait(900);
      const d=(await fetchJson(`${BASE}/ticket/detail?ticketId=${encodeURIComponent(candidate.ticketId)}`,{headers:headers(token)}))?.data||{};
      const blob=JSON.stringify(d);
      if(blob.includes(MARKER)||blob.includes(SKU)){row=candidate;break;}
    }
  }
  if(!row)throw new Error('Target CJ eBay support ticket not found');
  await wait(1100);
  const detail=(await fetchJson(`${BASE}/ticket/detail?ticketId=${encodeURIComponent(row.ticketId)}`,{headers:headers(token)}))?.data||{};
  const createTime=epoch(detail?.createTime??row?.createTime);
  const lastUpdateTime=epoch(detail?.lastUpdateTime??row?.lastUpdateTime);
  const status=statusFrom(detail,row);
  const replyDetected=status!=='AWAITING_CJ_REPLY'||Boolean(createTime&&lastUpdateTime&&lastUpdateTime>createTime);
  const report={
    schemaVersion:1,
    checkedAt:new Date().toISOString(),
    ticketId:clean(row?.ticketId,100),
    ticketNo:clean(row?.ticketNo,100),
    ticketType:clean(row?.ticketType??detail?.ticketType,160),
    issueType:clean(row?.issueType??detail?.issueType,160),
    status,
    replyDetected,
    createTime,
    lastUpdateTime,
    canRemind:Boolean(row?.canRemind??detail?.canRemind),
    hasReminded:Boolean(row?.hasReminded??detail?.hasReminded),
    detailKeys:keysOnly(detail),
    nextAction:replyDetected?'CJ response detected: review ticket detail before changing any listing location or authorization state.':'Waiting for CJ reply. No seller action required yet.'
  };
  await fs.mkdir('growth-reports/ebay',{recursive:true});
  await fs.writeFile(OUT,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}

main().catch(e=>{console.error(e?.stack||e);process.exit(1)});
