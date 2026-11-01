// Public price-only HTTP fallback for when the Coinbase WebSocket is blocked.
'use strict';
module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  res.setHeader('Cache-Control','public, s-maxage=3, stale-while-revalidate=5');
  try{
    const result=await fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker',{
      headers:{Accept:'application/json','User-Agent':'PaperTradeOS-Realtime-Research/1.0'},
      signal:AbortSignal.timeout(9000),cache:'no-store'
    });
    if(!result.ok)throw Error('Public source '+result.status);
    const q=await result.json();
    const price=Number(q.price),bid=Number(q.bid),ask=Number(q.ask),at=Date.parse(q.time);
    const lag=Date.now()-at;
    if(![price,bid,ask,at].every(Number.isFinite)||price<=0||bid<=0||ask<bid||lag>30000||lag< -5000)
      throw Error('Stale or malformed quote');
    res.status(200).json({mode:'PAPER_ONLY',quote:{price,bid,ask,at},provider:'Coinbase Exchange',noLiveOrders:true});
  }catch(e){res.status(503).json({error:'Quote unavailable',detail:String(e.message||e),noLiveOrders:true});}
};
