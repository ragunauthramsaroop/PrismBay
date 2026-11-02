/* Pure, deterministic, browser-side paper account engine. No live orders or network calls. */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.PaperSim = engine;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const DEFAULTS = Object.freeze({
    initialCash: 10000,
    instrument:'XAU/USD',barSeconds:300,
    fast: 8, slow: 21, maxAllocation: .10,
    feeRate: .0015, simulatedSlippage: .0010,
    stopFraction: .008, takeProfitFraction: .015,
    dailyLossLimit: .025, drawdownLimit: .10, enterThreshold: .0007
  });
  const finite = Number.isFinite;
  function fresh(quote, now) {
    if (!quote || !finite(quote.price) || quote.price <= 0 ||
        !finite(quote.bid) || !finite(quote.ask) ||
        quote.bid <= 0 || quote.ask <= 0 || quote.ask < quote.bid ||
        !finite(quote.at) || quote.at > now + 5000 || now - quote.at > 150000) return false;
    return true;
  }
  const fix = (n, digits = 8) => Number(n.toFixed(digits));
  function create(now = Date.now()) {
    return {
      version: 2, mode: 'PAPER_ONLY', instrument:'XAU/USD', startingCash: DEFAULTS.initialCash,
      startedAt: now, updatedAt: now, lastQuoteAt: null, lastBar: null,
      cash: DEFAULTS.initialCash, units: 0, entryPrice: 0,
      costBasis: 0, fees: 0, realizedPnl: 0, peakEquity: DEFAULTS.initialCash,
      dailyAnchor: DEFAULTS.initialCash, currentDay: new Date(now).toISOString().slice(0,10),
      halted: false, paused: false, interruption: false,
      lastDecision: 'Waiting for first completed minute signal',
      events: [], curve: [{at:now, equity:DEFAULTS.initialCash}],
      ordersPlaced: 0, completedPaperTrades: 0
    };
  }
  function readState(x) {
    if (!x || x.version !== 2 || x.mode !== 'PAPER_ONLY' || x.instrument !== 'XAU/USD') return null;
    for(const key of ['startedAt','updatedAt','cash','units','entryPrice','costBasis','fees','realizedPnl','peakEquity','dailyAnchor']){
      if(!finite(x[key])) return null;
    }
    if(x.cash < 0 || x.units < 0 || x.entryPrice < 0 || x.costBasis < 0 ||
       x.events?.length > 20000 || x.curve?.length > 1000 ||
       !Array.isArray(x.events) || !Array.isArray(x.curve)) return null;
    return x;
  }
  function mark(state, quote) {
    const liquid = quote && finite(quote.bid) && quote.bid > 0 ? quote.bid : 0;
    return {
      equity: state.cash + state.units * liquid,
      exposure: state.units * liquid,
      unrealized: state.units ? state.units * liquid * (1 - DEFAULTS.feeRate - DEFAULTS.simulatedSlippage) - state.costBasis : 0
    };
  }
  function event(state, name, qty, price, time, fee, reason) {
    state.events.unshift({id:'paper-'+state.events.length+'-'+time, at:time,
      type:name, qty:fix(qty), price:fix(price,2), fee:fix(fee,4), reason,
      cash:fix(state.cash,2), equity:fix(state.cash + state.units * price,2)});
    if(state.events.length > 300) state.events.length=300;
    state.lastDecision = reason;
  }
  function buy(state, quote, now, reason) {
    if (state.units > 0 || state.halted || state.paused || !fresh(quote, now)) return false;
    const equity = mark(state, quote).equity;
    const maxSpend = Math.min(state.cash, equity * DEFAULTS.maxAllocation);
    if(maxSpend <= 0) return false;
    const price = quote.ask * (1 + DEFAULTS.simulatedSlippage);
    const qty = maxSpend / (price * (1 + DEFAULTS.feeRate));
    const fee = qty * price * DEFAULTS.feeRate;
    const total = qty * price + fee;
    if(!finite(qty) || qty <= 0 || total > state.cash + .000001) return false;
    state.cash = Math.max(0, state.cash - total);
    state.units = qty;
    state.entryPrice = price;
    state.costBasis = total;
    state.fees += fee;
    state.ordersPlaced++;
    event(state,'BUY',qty,price,now,fee,reason);
    return true;
  }
  function sell(state, quote, now, reason) {
    if(state.units <= 0 || !fresh(quote,now)) return false;
    const qty = state.units;
    const price = quote.bid * (1 - DEFAULTS.simulatedSlippage);
    const proceeds = qty * price;
    const fee = proceeds * DEFAULTS.feeRate;
    const realized = proceeds - fee - state.costBasis;
    state.cash += proceeds - fee;
    state.fees += fee;
    state.realizedPnl += realized;
    state.units = 0; state.entryPrice = 0; state.costBasis = 0;
    state.ordersPlaced++; state.completedPaperTrades++;
    event(state,'SELL',qty,price,now,fee,reason);
    return true;
  }
  function validBars(bars) {
    return Array.isArray(bars) && bars.length >= DEFAULTS.slow &&
      bars.every((b,i)=> b && finite(b.close) && b.close > 0 &&
        finite(b.time) && (i === 0 || bars[i-1].time < b.time));
  }
  function process(stateInput, quote, bars, now = Date.now()) {
    const state = readState(stateInput);
    if(!state) throw new Error('Paper state invalid');
    if(!fresh(quote,now)) return {state,executed:[],status:'STALE'};
    const day = new Date(now).toISOString().slice(0,10);
    if(state.currentDay !== day){
      state.currentDay = day;
      state.dailyAnchor = mark(state,quote).equity;
    }
    const executed = [];
    const wasGap = state.lastQuoteAt && now - state.lastQuoteAt > 900000;
    if(wasGap) state.interruption = true;
    state.updatedAt=now;state.lastQuoteAt=quote.at;
    let equity = mark(state,quote).equity;
    state.peakEquity = Math.max(equity,state.peakEquity);
    const lossFromPeak=state.peakEquity>0?(state.peakEquity-equity)/state.peakEquity:0;
    const dailyLoss=state.dailyAnchor>0?(state.dailyAnchor-equity)/state.dailyAnchor:0;
    if(lossFromPeak >= DEFAULTS.drawdownLimit || dailyLoss >= DEFAULTS.dailyLossLimit){
      if(state.units>0 && sell(state,quote,now,lossFromPeak>=DEFAULTS.drawdownLimit?'DRAWDOWN CIRCUIT BREAKER':'DAILY LOSS CIRCUIT BREAKER'))executed.push('SELL');
      state.halted=true;
      state.lastDecision='Safety halt: maximum allowed paper loss reached';
    }
    if(!state.paused && !state.halted && !state.interruption && state.units>0){
      if(quote.bid <= state.entryPrice*(1-DEFAULTS.stopFraction)){
        if(sell(state,quote,now,'SIMULATED STOP LOSS'))executed.push('SELL');
      }else if(quote.bid >= state.entryPrice*(1+DEFAULTS.takeProfitFraction)){
        if(sell(state,quote,now,'SIMULATED TAKE PROFIT'))executed.push('SELL');
      }
    }
    if(!state.paused && !state.halted && !state.interruption && validBars(bars)){
      const latest=bars[bars.length-1];
      if(state.lastBar !== latest.time && latest.time + 300000 <= quote.at){
        const closes=bars.map(b=>b.close);
        const fast=closes.slice(-DEFAULTS.fast).reduce((a,b)=>a+b,0)/DEFAULTS.fast;
        const slow=closes.slice(-DEFAULTS.slow).reduce((a,b)=>a+b,0)/DEFAULTS.slow;
        const signal=(fast/slow)-1;
        state.lastBar=latest.time;
        state.lastSignal=fix(signal*100,4);
        if(state.units===0 && signal > DEFAULTS.enterThreshold){
          if(buy(state,quote,now,'FIVE-MINUTE GOLD SMA PAPER BUY'))executed.push('BUY');
        }else if(state.units>0 && signal < -DEFAULTS.enterThreshold){
          if(sell(state,quote,now,'FIVE-MINUTE GOLD SMA PAPER SELL'))executed.push('SELL');
        }else if(!executed.length) state.lastDecision=state.units>0?'Holding simulated position':'No qualifying signal; staying in virtual cash';
      }
    }
    equity=mark(state,quote).equity;
    state.curve.push({at:now,equity:fix(equity,4)});
    if(state.curve.length>240)state.curve.splice(0,state.curve.length-240);
    return {state,executed,status:state.paused?'PAUSED':state.halted?'HALTED':state.interruption?'FEED_GAP':'RUNNING'};
  }
  return {DEFAULTS,create,readState,mark,process,fresh,buy,sell};
});
