// Public price feed smoke test, no accounts, auth, or trading endpoints.
'use strict';
const url='wss://ws-feed.exchange.coinbase.com';
const ws=new WebSocket(url);
let done=false;
const timeout=setTimeout(()=>finish(1,'No public BTC ticker within 25 seconds'),25000);
function finish(code,msg){
  if(done)return;
  done=true;clearTimeout(timeout);
  console.log((code?'FAIL: ':'PASS: ')+msg);
  try{ws.close();}catch{}
  process.exitCode=code;
  setTimeout(()=>process.exit(code),120);
}
ws.addEventListener('open',()=>{
  ws.send(JSON.stringify({type:'subscribe',product_ids:['BTC-USD'],channels:['ticker','heartbeat']}));
});
ws.addEventListener('message',e=>{
  let data;try{data=JSON.parse(e.data);}catch{return;}
  if(data.type==='error')return finish(1,'Exchange WebSocket error: '+(data.message||'unknown'));
  if(data.type!=='ticker'||data.product_id!=='BTC-USD')return;
  const price=Number(data.price),bid=Number(data.best_bid),ask=Number(data.best_ask),stamp=Date.parse(data.time);
  if(![price,bid,ask,stamp].every(Number.isFinite)||price<=0||bid<=0||ask<bid)return;
  const lag=Date.now()-stamp;
  if(lag>20000||lag< -5000)return;
  finish(0,JSON.stringify({symbol:data.product_id,price,bid,ask,time:data.time,latencyMs:lag,source:'Coinbase public ticker',mode:'NO_LIVE_ORDERS'}));
});
ws.addEventListener('error',()=>finish(1,'Public WebSocket connection error'));
ws.addEventListener('close',()=>{if(!done)finish(1,'WebSocket closed before price received');});
