'use strict';
(async () => {
  const endpoints=[
    'https://xaus.com/api/v1/spot?compact=1',
    'https://xaus.com/api/v1/intraday?symbol=xau&hours=12',
    'https://xaus.com/api/v1/chart?symbol=xau&range=5d&interval=5m',
    'https://xaus.com/api/v1/chart?symbol=xau&range=1d&interval=5m'
  ];
  for (const url of endpoints) {
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'Accept':'application/json','User-Agent':'GoldResearchApp/1.0'}});
      const data=await response.json();
      const keys=Object.keys(data||{});
      const series=data.points||data.data||data.bars||data.candles;
      console.log('GOLD_SOURCE_PROBE='+JSON.stringify({endpoint:new URL(url).pathname+new URL(url).search,status:response.status,keys,ds:data.data_state,
        price:data.spot_usd_oz,asOf:data.updated_at,
        sample:typeof series==='object'?{count:series.length,first:series[0],last:series[series.length-1]}:Object.fromEntries(keys.slice(0,4).map(k=>[k,JSON.stringify(data[k]).slice(0,180)]))}));
    } catch(e){console.log('GOLD_SOURCE_PROBE_ERROR='+JSON.stringify({url,error:String(e)}))}
  }
})();
