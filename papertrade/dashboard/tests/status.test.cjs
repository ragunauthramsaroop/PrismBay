// Standalone read-only API regression checks. Run with node --test.
const assert=require('node:assert/strict');
const {test}=require('node:test');
const handler=require('../api/status.js');

const today=new Date();
const utcToday=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()));
const anchor=new Date(utcToday.valueOf()-86400000).toISOString().slice(0,10);
const date=offset=>new Date(utcToday.valueOf()+(offset*86400000)).toISOString().slice(0,10);
const atDay=offset=>Math.floor((utcToday.valueOf()+offset*86400000)/1000);

function mockFetch(includeData=true){
  const calls=[];
  global.fetch=async input=>{
    const url=String(input);calls.push(url);
    let body;
    if(url.includes('/actions/workflows/papertrade-daily.yml/runs')){
      body={workflow_runs:[{
        id:101,name:'Daily Paper Trading Research (Read Only)',head_branch:'main',status:'completed',conclusion:'success',
        run_started_at:new Date().toISOString(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),
        html_url:'https://github.com/ragunauthramsaroop/PrismBay/actions/runs/101',head_sha:'abcdef987654',event:'schedule'
      }]};
    }else if(url.includes('/actions/workflows/papertrade-ci.yml/runs'))body={workflow_runs:[]};
    else if(url.includes('/ticker'))body={price:'120.50',bid:'120.10',ask:'120.90',volume:'410.5',time:new Date().toISOString()};
    else if(url.includes('ledger.json'))body={
      version:1,mode:'PAPER_ONLY',last_date:anchor,started_after_candle:anchor,cash:10000,units:0,
      entry_price:0,fees:0,max_equity:10000,halted:false,last_equity:10000,events:[],
      config:{fast_window:20,slow_window:50,initial_cash:10000,max_position_fraction:0.15,
      fee_bps:15,slippage_bps:10,stop_loss_fraction:0.05,max_drawdown_fraction:0.10,daily_loss_fraction:0.025}
    };
    else if(url.includes('/candles?')){
      const params=new URL(url).searchParams;
      const start=Date.parse(params.get('start'));const end=Date.parse(params.get('end'));
      body=[];
      for(let offset=-250;offset<=0;offset++){
        const stamp=atDay(offset);const ms=stamp*1000;
        if(ms<start||ms>end)continue;
        const close=101+offset*0.05;
        body.push([stamp,close-1,close+1,close-.3,close,1100]);
      }
    } else throw Error('unexpected request '+url);
    return {ok:includeData,status:includeData?200:503,json:async()=>body};
  };
  return calls;
}
async function call(){
  const head={};
  const res={setHeader(name,val){head[name]=val;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await handler({method:'GET'},res);
  return {status:res.code,data:res.data,headers:head};
}
test('reports live market data without live orders',async()=>{
  const calls=mockFetch();
  const result=await call();
  assert.equal(result.status,200);
  assert.equal(result.data.tradingMode,'PAPER_ONLY');
  assert.equal(result.data.realOrders,0);
  assert.equal(result.data.market.price,120.5);
  assert.equal(result.data.portfolio.equity,10000);
  assert.equal(result.data.portfolio.authority,'ESTIMATE_NOT_GITHUB_LEDGER');
  assert.equal(result.data.operations.health,'HEALTHY');
  assert.match(result.headers['Cache-Control'],/s-maxage/);
  assert.equal(calls.some(x=>x.includes('/orders')),false);
});
test('forbids non-GET API methods',async()=>{
  let code=null;
  await handler({method:'POST'},{
    setHeader(){},status(n){code=n;return this;},json(){return this;}
  });
  assert.equal(code,405);
});
test('degrades safely when upstream APIs fail',async()=>{
  mockFetch(false);
  const result=await call();
  assert.equal(result.status,200);
  assert.equal(result.data.market,null);
  assert.equal(result.data.portfolio,null);
  assert.equal(result.data.realOrders,0);
  assert.equal(result.data.operations.health,'UNAVAILABLE');
  assert.ok(result.data.errors.market);
});
