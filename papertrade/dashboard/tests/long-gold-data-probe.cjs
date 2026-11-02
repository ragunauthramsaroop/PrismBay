/* Public gold long-range dataset diagnostics. No financial accounts. */
'use strict';
const {get}=require('../gold-data.cjs');
(async()=>{
 for(const path of ['/chart?symbol=xau&range=5y&interval=1d','/history']){
  try{
   const x=await get(path);
   const p=Array.isArray(x.points)?x.points:[];
   console.log('GOLD_LONG_DATA_PROBE='+JSON.stringify({
    endpoint:path,symbol:x.symbol,interval:x.interval,
    points:p.length,keys:Object.keys(x).slice(0,16),
    first:p[0]||null,last:p.at(-1)||null,
    dataState:x.data_state||null
   }));
  }catch(e){console.log('GOLD_LONG_DATA_PROBE_ERROR='+JSON.stringify({endpoint:path,error:String(e.message||e)}));}
 }
})();
