/* Indicative gold XAU/USD, no exchange orders. */
'use strict';
const {loadSpot,SYMBOL}=require('../gold-data.cjs');
module.exports=async(req,res)=>{
  if(req.method!=='GET')return res.status(405).json({error:'GET only'});
  res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=15');
  res.setHeader('X-Content-Type-Options','nosniff');
  try{const quote=await loadSpot();return res.status(200).json({
    mode:'PAPER_ONLY',symbol:SYMBOL,quote,priceFresh:quote.priceFresh,
    provider:'XAUS public indicative gold spot',source:'XAU/USD indicative mid',
    noLiveOrders:true,marketStatus:quote.priceFresh?'INDICATIVE_FRESH':'CLOSED_OR_STALE'});}
  catch(e){return res.status(503).json({error:'Gold spot unavailable',detail:String(e.message||e),noLiveOrders:true});}
};
