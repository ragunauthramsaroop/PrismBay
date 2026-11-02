/* Deterministic historical market playback for PaperTrade OS, NO live execution. */
(function(root,factory){
  const replay=factory(typeof module==='object'&&module.exports?require('./live-core.cjs'):root.PaperSim);
  if(typeof module==='object'&&module.exports)module.exports=replay;
  if(root)root.PaperReplay=replay;
})(typeof window!=='undefined'?window:null,function(Core){
  'use strict';
  if(!Core)throw Error('Missing paper-only simulation engine');
  const SPREAD_BPS=1;
  function validated(raw) {
    if(!Array.isArray(raw)||raw.length<60||raw.length>1510)throw Error('Need 60-1510 five-minute gold chart candles');
    const bars=raw.map(b=>({time:Number(b.time),open:Number(b.open),close:Number(b.close),
      high:Number(b.high),low:Number(b.low),volume:Number(b.volume)}));
    for(let i=0;i<bars.length;i++){
      const x=bars[i];
      if(!Object.values(x).every(Number.isFinite)||x.time<=0||x.open<=0||x.close<=0||
        x.low<=0||x.high<Math.max(x.open,x.close,x.low)||
        x.low>Math.min(x.open,x.close)||x.volume<0||
        (i&&x.time<=bars[i-1].time)||
        (i&&x.time-bars[i-1].time<300000))throw Error('Invalid or gapped BTC candle history');
    }
    return bars;
  }
  function create(rows, meta={}){
    const bars=validated(rows);
    const offset=Core.DEFAULTS.slow+1;
    const first=bars[offset];
    const s=Core.create(first.time+1000);
    return {
      mode:'HISTORICAL_REPLAY_ONLY',source:meta.source||'XAUS public XAU chart proxy',
      bars,position:offset,state:s,quote:null,lastPrice:first.open,segmentStart:0,
      firstIndex:offset,initialPrice:first.open,history:[],fills:[],closedReturns:[],
      drawdownPct:0,peak:10000,halted:false,paused:true,
      finished:false,stage:'READY',startedAt:bars[offset].time,stepCount:0,
      spreadBps:SPREAD_BPS
    };
  }
  function simulateOne(session){
    if(session.finished)return session;
    const {bars}=session;let i=session.position;
    if(i>=bars.length){session.finished=true;session.paused=true;session.stage='COMPLETE';return session;}
    const bar=bars[i];
    // Price feeds pause on weekends and rollover breaks. No invented in-gap bars.
    // Restart indicator warm-up after a gap; a held position remains exposed to the opening price.
    if(i>0 && bar.time-bars[i-1].time>450000){
      session.segmentStart=i;
      session.state.lastQuoteAt=null;
      session.state.lastBar=null;
    }
    // Only completed five-minute bars in the current continuous market segment.
    const prior=bars.slice(Math.max(session.segmentStart,i-100),i);
    const time=bar.time+1000;
    const spread=bar.open*SPREAD_BPS/20000;
    const quote={price:bar.open,bid:bar.open-spread,ask:bar.open+spread,at:time};
    if(!Core.fresh(quote,time))throw Error('Paper execution quote invalid');
    const previousRealized=session.state.realizedPnl;
    const previousEvents=session.state.events.length;
    const out=Core.process(session.state,quote,prior,time);
    session.quote=quote;
    session.lastPrice=bar.open;
    const eq=Core.mark(session.state,quote).equity;
    session.peak=Math.max(session.peak,eq);
    session.drawdownPct=Math.max(session.drawdownPct,100*(session.peak-eq)/session.peak);
    if(!Number.isFinite(eq)||eq<=0||session.state.cash<0||session.state.units<0)throw Error('Invalid simulated portfolio');
    session.history.push({time,price:bar.open,equity:eq,exposure:session.state.units*quote.bid,
      goldBenchmark:10000*bar.open/session.initialPrice,decision:out.executed.join('+')||'HOLD'});
    for(const action of out.executed){
      const fill=session.state.events.find(e=>e.at===time&&e.type===action);
      if(fill){
        const realized=action==='SELL'?session.state.realizedPnl-previousRealized:null;
        session.fills.push({at:time,index:i,side:action,qty:fill.qty,price:fill.price,fee:fill.fee,
          reason:fill.reason,profit:realized,equity:eq});
        if(action==='SELL')session.closedReturns.push(realized);
      }
    }
    session.stepCount++;
    session.position++;
    session.halted=session.state.halted;
    if(session.state.halted){session.finished=true;session.paused=true;session.stage='RISK HALTED';}
    else if(session.position>=bars.length){session.finished=true;session.paused=true;session.stage='COMPLETE';}
    else session.stage='PLAYING';
    return session;
  }
  function advance(session,count=1){
    if(!session||session.mode!=='HISTORICAL_REPLAY_ONLY')throw Error('Invalid simulation session');
    if(!Number.isInteger(count)||count<1||count>2000)throw Error('Invalid playback increment');
    for(let i=0;i<count&&!session.finished;i++)simulateOne(session);
    return session;
  }
  function metrics(s){
    const first=s.history[0],last=s.history[s.history.length-1];
    const eq=last?last.equity:s.state.startingCash;
    const change=eq-s.state.startingCash;
    const goldBenchmark=last?last.goldBenchmark:s.state.startingCash;
    const wins=s.closedReturns.filter(p=>p>0).length;
    return {
      mode:s.mode,stage:s.stage,paused:s.paused,finished:s.finished,
      steps:s.stepCount,totalSteps:s.bars.length-s.firstIndex,
      time:last?.time||null,equity:eq,pnl:change,pnlPct:change/s.state.startingCash*100,
      cash:s.state.cash,goldOunces:s.state.units,positionValue:s.state.units*(s.quote?.bid||0),
      fees:s.state.fees,realizedPnl:s.state.realizedPnl,
      unrealizedPnl:s.quote?Core.mark(s.state,s.quote).unrealized:0,
      buys:s.fills.filter(f=>f.side==='BUY').length,sells:s.closedReturns.length,
      closedWins:wins,closedLosses:s.closedReturns.length-wins,
      winRate:s.closedReturns.length?wins/s.closedReturns.length*100:null,
      drawdownPct:s.drawdownPct,goldBenchmark,goldBenchmarkPct:(goldBenchmark/10000-1)*100,
      lastPrice:last?.price??s.initialPrice,
      feeModel:'15bps per side + 10bps slippage per side + 1bp assumed spread, gold chart proxy',
      maxAllocationPct:Core.DEFAULTS.maxAllocation*100,
      lastAction:s.fills[s.fills.length-1]||null
    };
  }
  return {create,advance,metrics,validated,spreadBps:SPREAD_BPS};
});
