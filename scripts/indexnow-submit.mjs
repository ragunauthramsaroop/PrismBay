const KEY='927a4d6b8c21e5f73a90bc14d2ef6a31';
const HOST='clean.prismbayai.com';
const ROOT='https://'+HOST+'/';
const CORE_URLS=[
  ROOT,
  ROOT+'garment-steamer/',
  ROOT+'guides/portable-garment-steamer.html',
  ROOT+'guides/garment-steamer-vs-iron.html',
  ROOT+'guides/travel-garment-steamer-guide.html',
  ROOT+'guides/how-to-use-a-garment-steamer.html',
  ROOT+'shipping.html',
  ROOT+'returns.html',
  ROOT+'contact.html'
];
const DIGITAL_URLS=[
  ROOT+'digital/',
  ROOT+'learn/stakeholder-mapping-toolkit.html',
  ROOT+'learn/esg-reporting-toolkit.html',
  ROOT+'learn/board-briefing-white-paper-system.html',
  ROOT+'learn/executive-intelligence-bundle.html'
];
const event=process.env.GITHUB_EVENT_NAME||'manual';
const hour=new Date().getUTCHours();
if(event==='schedule' && ![0,12].includes(hour)){
  console.log(JSON.stringify({status:'SKIP',reason:'scheduled_indexnow_twice_daily_only',hour,event}));
  process.exit(0);
}
const keyLocation=ROOT+KEY+'.txt';
const keyProof=await fetch(keyLocation,{redirect:'follow',signal:AbortSignal.timeout(10000)});
const proofText=(await keyProof.text()).trim();
if(!keyProof.ok || proofText!==KEY) throw new Error('indexnow_key_proof_failed_http_'+keyProof.status);
const liveUrls=[];
for(const url of [...CORE_URLS,...DIGITAL_URLS]){
  const r=await fetch(url,{method:'HEAD',redirect:'follow',signal:AbortSignal.timeout(10000)});
  if(r.ok) liveUrls.push(url);
  else if(CORE_URLS.includes(url)) throw new Error('public_url_not_live_'+r.status+'_'+url);
}
const payload={host:HOST,key:KEY,keyLocation,urlList:liveUrls};
const r=await fetch('https://api.indexnow.org/indexnow',{
  method:'POST',
  headers:{'content-type':'application/json; charset=utf-8','user-agent':'PrismBay-IndexNow/2.1'},
  body:JSON.stringify(payload),
  signal:AbortSignal.timeout(15000)
});
const body=await r.text();
if(![200,202].includes(r.status)){
  if(r.status===429){
    console.warn(JSON.stringify({status:'RATE_LIMITED',httpStatus:r.status,urlCount:liveUrls.length,body:body.slice(0,300)}));
    process.exit(0);
  }
  throw new Error('indexnow_submit_failed_http_'+r.status+':'+body.slice(0,300));
}
console.log(JSON.stringify({status:'PASS',httpStatus:r.status,urlCount:liveUrls.length,keyLocation,submittedAt:new Date().toISOString()}));
