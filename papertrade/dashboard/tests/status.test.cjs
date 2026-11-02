const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/status.js');
function mock(up=true){
  const calls=[],now=Date.now();
  global.fetch=async url=>{
    const address=String(url);calls.push(address);
    if(!up)return {ok:false,status:503,json:async()=>({error:'source down'})};
    let data;
    if(address.includes('/api/v1/spot')){
      data={spot_usd_oz:3900,data_state:{status:'fresh',as_of:new Date(now-10000).toISOString()},updated_at:new Date(now).toISOString()};
    }else if(address.includes('/api/v1/chart')){
      data={symbol:'xau',points:Array.from({length:100},(_,i)=>{
        const t=Math.floor(now/300000)*300-300*(100-i);
        return {t,o:3900+i*.3,h:3901+i*.3,l:3899+i*.3,c:3900.1+i*.3,v:0};
      })};
    }else if(address.includes('/actions/workflows/papertrade-daily.yml/runs')){
      data={workflow_runs:[{id:3,name:'Daily Gold-Only Paper Research (Read Only)',head_branch:'main',
        status:'completed',conclusion:'success',created_at:new Date(now).toISOString(),
        html_url:'https://github.com/example/actions/runs/3',head_sha:'123456abc'}]};
    }else if(address.includes('/actions/workflows/papertrade-dashboard-ci.yml/runs')){
      data={workflow_runs:[{id:4,name:'Gold only dashboard tests',head_branch:'experiment/ai-paper-trading',
        status:'completed',conclusion:'success',created_at:new Date(now).toISOString(),
        html_url:'https://github.com/example/actions/runs/4',head_sha:'abcdef123'}]};
    }else throw Error('Unexpected URL '+address);
    return {ok:true,status:200,json:async()=>data};
  };
  return calls;
}
async function request(method='GET'){
  const head={};
  const response={setHeader(k,v){head[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await handler({method},response);return {head,code:response.code,data:response.data};
}
test('gold-only XAU/USD spot prices without any BTC calls',async()=>{
  const calls=mock();
  const r=await request();
  assert.equal(r.code,200);
  assert.equal(r.data.symbol,'XAU/USD');
  assert.equal(r.data.tradingMode,'PAPER_ONLY');
  assert.equal(r.data.realOrders,0);
  assert.equal(r.data.market.price,3900);
  assert.equal(r.data.market.unit,'USD per troy ounce');
  assert.equal(r.data.market.estimatedBidAsk,true);
  assert.equal(r.data.portfolio,null);
  assert.equal(r.data.priceHistory.length,100);
  assert.equal(r.data.research.results.length,0);
  assert.equal(r.data.operations.health,'HEALTHY');
  assert.ok(calls.every(x=>!x.includes('BTC-USD')&&!x.includes('Coinbase')&&!x.includes('/orders')));
});
test('non-GET blocked',async()=>{
  mock();assert.equal((await request('POST')).code,405);
});
test('upstream failure fails safely without fabricated gold prices',async()=>{
  mock(false);
  const r=await request();
  assert.equal(r.code,200);assert.equal(r.data.market,null);
  assert.equal(r.data.realOrders,0);
  assert.ok(r.data.errors.gold);
});
