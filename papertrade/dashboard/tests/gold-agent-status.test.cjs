'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const handler=require('../api/agents.js');
async function request(method='GET'){
 const r={status(code){this.statusCode=code;return this;},
   setHeader(k,v){(this.headers||={})[k]=v;},
   json(x){this.body=x;return this;}};
 await handler({method},r);return r;
}
test('gold agent backend status reports seven roles, zero execution and public run evidence',async()=>{
 const initial=global.fetch;
 global.fetch=async url=>({
  ok:true,status:200,json:async()=>({workflow_runs:[{
   id:4140000,status:'completed',conclusion:'success',
   head_branch:'main',run_started_at:'2026-11-02T02:00:00Z',
   updated_at:'2026-11-02T02:02:00Z',
   html_url:'https://github.com/ragunauthramsaroop/PrismBay/actions/runs/4140000'
  }]})
 });
 try{
  const res=await request();
  a.equal(res.statusCode,200);
  a.equal(res.body.symbol,'XAU/USD');
  a.equal(res.body.agents.length,7);
  a.equal(res.body.status,'LAST_RUN_PASSED');
  a.equal(res.body.latest.result,'success');
  a.equal(res.body.liveBrokerOrders,false);
  a.equal(res.body.liveCapitalConnected,false);
  a.equal(res.body.automaticModelPromotion,false);
  a.match(res.body.cadence,/three hours/);
 }finally{global.fetch=initial;}
});
test('no network orders even when Github metadata source fails',async()=>{
 const initial=global.fetch;
 global.fetch=async()=>{throw Error('Public GitHub status temporary failure');};
 try{
  const res=await request();
  a.equal(res.statusCode,503);a.equal(res.body.liveBrokerOrders,false);
 }finally{global.fetch=initial;}
});
test('non-GET requests are rejected',async()=>{a.equal((await request('POST')).statusCode,405);});
test('Agent status card and client script are present on research page',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 const js=fs.readFileSync(path.resolve(__dirname,'../strategy-view.js'),'utf8');
 a.ok(html.includes('id="agentOverall"'));
 a.ok(html.includes('id="agentWorkflowLink"'));
 a.ok(html.includes('Market Data Sentinel'));
 a.ok(html.includes('Independent Evaluator'));
 a.ok(js.includes("fetch('/api/agents'"));
});
