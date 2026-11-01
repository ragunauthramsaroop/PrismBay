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
    if(!Array.isArray(raw)||raw.length<60||raw.length>1510)throw Error('Need 60-1510 completed minute candles');
    const bars=raw.map(b=>({time:Number(b.time),open:Number(b.open),close:Number(b.close),
      high:Number(b.high),low:Number(b.low),volume:Number(b.volume)}));
    for(let i=0;i<bars.length;i++){
      const x=bars[i];
      if(!Object.values(x).every(Number.isFinite)||x.time<=0||x.open<=0||x.close<=0||
        x.low<=0||x.high<Math.max(x.open,x.close,x.low)||
        x.low>Math.min(x.open,x.close)||x.volume<0||
        (i&&x.time<=bars[i-1].time)||
        (i&&x.time-bars[i-1].time>120000))throw Error('Invalid or gapped BTC candle history');
    }
    return bars;
  }
  function create(rows, meta={}){
    const bars=validated(rows);
    const offset=Core.DEFAULTS.slow+1;
    const first=bars[offset];
    const s=Core.create(first.time+1000);
    return {
      mode:'HISTORICAL_REPLAY_ONLY',source:meta.source||'Coinbase public historical candles',
      bars,position:offset,state:s,quote:null,lastPrice:first.open,
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
    // Only one-minute candles completed before the current opening quote are input to the decision.
    const prior=bars.slice(Math.max(0,i-100),i);
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
      btcBenchmark:10000*bar.open/session.initialPrice,decision:out.executed.join('+')||'HOLD'});
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
    const btcBenchmark=last?last.btcBenchmark:s.state.startingCash;
    const wins=s.closedReturns.filter(p=>p>0).length;
    return {
      mode:s.mode,stage:s.stage,paused:s.paused,finished:s.finished,
      steps:s.stepCount,totalSteps:s.bars.length-s.firstIndex,
      time:last?.time||null,equity:eq,pnl:change,pnlPct:change/s.state.startingCash*100,
      cash:s.state.cash,btcUnits:s.state.units,positionValue:s.state.units*(s.quote?.bid||0),
      fees:s.state.fees,realizedPnl:s.state.realizedPnl,
      unrealizedPnl:s.quote?Core.mark(s.state,s.quote).unrealized:0,
      buys:s.fills.filter(f=>f.side==='BUY').length,sells:s.closedReturns.length,
      closedWins:wins,closedLosses:s.closedReturns.length-wins,
      winRate:s.closedReturns.length?wins/s.closedReturns.length*100:null,
      drawdownPct:s.drawdownPct,btcBenchmark,btcBenchmarkPct:(btcBenchmark/10000-1)*100,
      lastPrice:last?.price??s.initialPrice,
      feeModel:'15bps per side + 10bps slippage per side + 1bp estimated spread',
      maxAllocationPct:Core.DEFAULTS.maxAllocation*100,
      lastAction:s.fills[s.fills.length-1]||null
    };
  }
  return {create,advance,metrics,validated,spreadBps:SPREAD_BPS};
});
