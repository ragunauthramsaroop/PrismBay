'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {recordedDailyCloses}=require('../gold-data.cjs');
test('daily five-year gold history leaves missing opening prices missing',()=>{
 const dates=Array.from({length:820},(_,i)=>{
  const d=new Date(Date.UTC(2021,0,1+i)).toISOString().slice(0,10),close=1850+i*.1;
  return {d,c:close,h:close+8,l:close-8};
 });
 const bars=recordedDailyCloses({symbol:'XAUUSD',interval:'daily',points:dates});
 a.equal(bars.length,820);
 a.equal('open' in bars[0],false);
 a.equal(bars[0].close,1850);
});
test('short, wrong symbol, malformed history cannot masquerade as five years',()=>{
 const dates=Array.from({length:820},(_,i)=>{
  const d=new Date(Date.UTC(2021,0,1+i)).toISOString().slice(0,10),c=1850+i*.1;
  return {d,c,h:c+8,l:c-8};
 });
 a.throws(()=>recordedDailyCloses({symbol:'BTCUSD',interval:'daily',points:dates}),/Expected XAU/);
 a.throws(()=>recordedDailyCloses({symbol:'XAUUSD',interval:'daily',points:dates.slice(0,100)}),/Insufficient/);
});
test('interface states daily-close assumption and disabled real-money execution',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
 const api=fs.readFileSync(path.resolve(__dirname,'../api/research.js'),'utf8');
 const js=fs.readFileSync(path.resolve(__dirname,'../strategy-view.js'),'utf8');
 for(const id of ['swingBars','swingFolds','swingReturn','swingBaseline','swingStress','swingPositive','swingRows'])
  a.ok(html.includes('id="'+id+'"'),id);
 a.ok(html.includes('Daily opening prices'));
 a.ok(api.includes('livePromotion:'));
 a.ok(api.includes('liveOrders:0'));
 a.ok(js.includes('renderSwing('));
});
