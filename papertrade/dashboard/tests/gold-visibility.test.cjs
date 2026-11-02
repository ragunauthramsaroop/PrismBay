'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const handler=require('../api/stream-init.js');

function goldPublicData() {
  const current=Math.floor(Date.now()/300000)*300000;
  const points=[];
  for(let i=0;i<38;i++){
    const t=current-(38+12+30-i)*300000;
    const p=3900+i*.1;
    points.push({t:t/1000,o:p,h:p+1,l:p-1,c:p+.1,v:0});
  }
  for(let i=0;i<12;i++){
    const t=current-(12-i)*300000;
    const p=3910+i*.1;
    points.push({t:t/1000,o:p,h:p+1,l:p-1,c:p+.1,v:0});
  }
  return points;
}
test('gold stream endpoint serves a price chart during trading indicator warm-up',async()=>{
  const points=goldPublicData(),urls=[];
  const original=global.fetch;
  global.fetch=async (url)=>{
    urls.push(String(url));
    const body=String(url).includes('/spot?')
      ? {spot_usd_oz:3911.6,data_state:{status:'fresh',as_of:new Date(Date.now()-10000).toISOString()}}
      : {symbol:'xau',points};
    return {ok:true,status:200,json:async()=>body};
  };
  try{
    const response={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.data=v;return this;}};
    await handler({method:'GET'},response);
    assert.equal(response.code,200);
    assert.equal(response.data.symbol,'XAU/USD');
    assert.equal(response.data.noLiveOrders,true);
    assert.equal(response.data.requiredSignalBars,25);
    assert.equal(response.data.historyCount,12);
    assert.equal(response.data.missingSignalBars,13);
    assert.equal(response.data.historyFresh,false);
    assert.equal(response.data.readiness,'WAITING_FOR_GOLD_5MIN_HISTORY');
    assert.equal(response.data.chartBars.length,50);
    assert.ok(urls.every(u=>!u.includes('BTC-USD')&&!u.includes('Coinbase')));
  }finally{global.fetch=original;}
});
test('gold chart shown on live tab with working replay button and quick results region',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const runtime=fs.readFileSync(path.join(__dirname,'..','live-runtime.js'),'utf8');
  const replay=fs.readFileSync(path.join(__dirname,'..','replay-ui.js'),'utf8');
  for(const marker of ['id="goldMarketChart"','id="goldWarmupCount"','id="goldQuickPnl"','id="goldRunReplay"']){
    assert.ok(html.includes(marker),'missing UI '+marker);
  }
  assert.ok(html.includes('data-goto="simulation"'));
  assert.ok(runtime.includes('goldChartBars'));
  assert.ok(runtime.includes('goldChart();'));
  assert.ok(replay.includes("set('goldQuickPnl'"));
  assert.ok(!html.includes('BITCOIN / USD'));
});
