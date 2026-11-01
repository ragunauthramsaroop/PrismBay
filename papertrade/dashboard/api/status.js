'use strict';
// Read-only data aggregation for a public PAPER-ONLY research dashboard.
// No OAuth, exchange accounts, trade endpoints, or private credentials.
const REPO = 'ragunauthramsaroop/PrismBay';
const BASE = 'https://api.github.com/repos/' + REPO;
const RAW_STATE = 'https://raw.githubusercontent.com/' + REPO + '/experiment/ai-paper-trading/papertrade/state/ledger.json';
const EXCHANGE = 'https://api.exchange.coinbase.com';
const HOUR = 3600000, DAY = 24 * HOUR;

async function getJSON(url, timeout = 8500) {
  const response = await fetch(url, {
    headers: {'Accept': 'application/json', 'User-Agent': 'PaperTrade-Research-Monitor/1.0'},
    signal: AbortSignal.timeout(timeout),
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Source HTTP ' + response.status);
  return await response.json();
}
const round = (n, dp = 2) => Number(n.toFixed(dp));
function runSummary(r) {
  return {
    id: r.id, name: r.name, branch: r.head_branch, status: r.status,
    conclusion: r.conclusion, started_at: r.run_started_at || r.created_at,
    updated_at: r.updated_at, url: r.html_url, event: r.event,
    sha: r.head_sha ? r.head_sha.slice(0, 7) : null
  };
}
function candleFromRow(x) {
  if (!Array.isArray(x) || x.length < 6) throw new Error('Malformed candle');
  const iso = new Date(Number(x[0]) * 1000).toISOString().slice(0, 10);
  const c = {date: iso, low: Number(x[1]), high: Number(x[2]),
             open: Number(x[3]), close: Number(x[4]), volume: Number(x[5])};
  if (![c.low, c.high, c.open, c.close, c.volume].every(Number.isFinite) ||
      c.low <= 0 || c.open <= 0 || c.close <= 0 || c.high < Math.max(c.open, c.close) ||
      c.low > Math.min(c.open, c.close) || c.volume < 0) {
    throw new Error('Invalid OHLCV record');
  }
  return c;
}
async function completedCandles(anchor) {
  const initial = Date.parse(anchor + 'T00:00:00.000Z') - 120 * DAY;
  const finish = Date.now();
  if (!Number.isFinite(initial) || initial > finish || finish - initial > 1850 * DAY) {
    throw new Error('Journal anchor date invalid or too old');
  }
  const segments = [];
  for (let start = initial; start < finish; start += 170 * DAY) {
    const end = Math.min(start + 170 * DAY, finish);
    const query = new URLSearchParams({
      granularity: '86400', start: new Date(start).toISOString(),
      end: new Date(end).toISOString()
    });
    segments.push(getJSON(EXCHANGE + '/products/BTC-USD/candles?' + query.toString()));
  }
  const chunks = await Promise.all(segments);
  const index = new Map();
  chunks.flat().forEach(row => {
    const c = candleFromRow(row);
    if (c.date >= new Date(initial).toISOString().slice(0, 10)) index.set(c.date, c);
  });
  const todayUTC = new Date().toISOString().slice(0, 10);
  const bars = [...index.values()].filter(c => c.date < todayUTC)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!bars.length || !bars.some(c => c.date === anchor)) {
    throw new Error('Anchor candle missing from public price history');
  }
  return bars;
}
function replay(seed, bars) {
  if (seed.mode !== 'PAPER_ONLY' || seed.version !== 1) {
    throw new Error('Unexpected journal version or prohibited mode');
  }
  const dateIndex = bars.findIndex(c => c.date === seed.last_date);
  if (dateIndex < 0) throw new Error('Seed date missing');
  const cfg = seed.config;
  const maxPosition = Number(cfg.max_position_fraction), fee = cfg.fee_bps / 10000;
  const slippage = cfg.slippage_bps / 10000;
  const slowWindow = cfg.slow_window, fastWindow = cfg.fast_window;
  if (!Number.isFinite(fee) || !Number.isFinite(slippage) ||
      !(slowWindow > fastWindow && fastWindow > 0) ||
      maxPosition <= 0 || maxPosition >= 1) throw new Error('Journal configuration invalid');
  let cash = Number(seed.cash), units = Number(seed.units),
      entry = Number(seed.entry_price), fees = Number(seed.fees),
      peak = Number(seed.max_equity), lastEquity = Number(seed.last_equity),
      halted = Boolean(seed.halted);
  const events = [];
  const equity = [{date: seed.last_date, equity: lastEquity}];
  for (let i = dateIndex + 1; i < bars.length; i++) {
    const day = bars[i];
    if (i < slowWindow) throw new Error('Insufficient strategy lookback');
    const fast = bars.slice(i - fastWindow, i).reduce((s, p) => s + p.close, 0) / fastWindow;
    const slow = bars.slice(i - slowWindow, i).reduce((s, p) => s + p.close, 0) / slowWindow;
    const openEquity = cash + units * day.open;
    const dailyOpenLoss = lastEquity > 0 ? (lastEquity - openEquity) / lastEquity : 0;
    const drawdownOpen = peak > 0 ? (peak - openEquity) / peak : 0;
    let decision = 'HOLD', dailyFee = 0, tradedQuantity = 0;
    const sell = (marketPrice, reason) => {
      if (units <= 0) return;
      const sellPrice = marketPrice * (1 - slippage);
      const proceeds = units * sellPrice;
      const transactionFee = proceeds * fee;
      tradedQuantity = units;
      cash += proceeds - transactionFee;
      dailyFee += transactionFee; units = 0; entry = 0;
      decision = reason;
    };
    const blocked = halted || dailyOpenLoss >= cfg.daily_loss_fraction ||
      drawdownOpen >= cfg.max_drawdown_fraction;
    if (blocked) {
      sell(day.open, 'RISK_GATE_SELL');
      if (halted || drawdownOpen >= cfg.max_drawdown_fraction) halted = true;
    } else if (units > 0 && fast < slow) {
      sell(day.open, 'TREND_SELL');
    } else if (units <= 0 && fast > slow) {
      const budget = Math.min(cash, (cash + units * day.open) * maxPosition);
      const price = day.open * (1 + slippage);
      const qty = budget / (price * (1 + fee));
      if (qty > 0) {
        const transactionFee = qty * price * fee;
        cash -= qty * price + transactionFee;
        units += qty; entry = price; dailyFee += transactionFee;
        decision = 'TREND_BUY'; tradedQuantity = qty;
      }
    }
    if (units > 0 && day.low <= entry * (1 - cfg.stop_loss_fraction)) {
      const stopPrice = Math.min(day.open, entry * (1 - cfg.stop_loss_fraction));
      sell(stopPrice, 'INTRADAY_STOP_APPROX');
    }
    lastEquity = cash + units * day.close;
    peak = Math.max(peak, lastEquity);
    const dd = (peak - lastEquity) / peak;
    if (dd >= cfg.max_drawdown_fraction) halted = true;
    if (cash < -1e-7 || units < 0 || ![cash, units, lastEquity].every(Number.isFinite)) {
      throw new Error('Invalid paper balance');
    }
    cash = Math.max(0, cash); fees += dailyFee;
    equity.push({date: day.date, equity: round(lastEquity, 6)});
    events.push({
      date: day.date, type: decision, qty: round(tradedQuantity, 8),
      equity: round(lastEquity, 2), cash: round(cash, 2),
      fees: round(dailyFee, 4), halted, drawdown: round(dd * 100, 3)
    });
  }
  return {
    source: 'Independent public-price replay from experiment seed',
    authority: 'ESTIMATE_NOT_GITHUB_LEDGER',
    asOf: bars[bars.length - 1].date,
    seedDate: seed.started_after_candle,
    cash: round(cash), equity: round(lastEquity),
    positionUnits: round(units, 8), positionValue: round(units * bars[bars.length - 1].close),
    pnl: round(lastEquity - cfg.initial_cash),
    pnlPct: round((lastEquity / cfg.initial_cash - 1) * 100, 3),
    fees: round(fees, 4),
    exposurePct: round((units * bars[bars.length - 1].close / Math.max(lastEquity, 0.01)) * 100, 2),
    halted, paperEvents: events,
    equityCurve: equity, initial: cfg.initial_cash,
    maxDrawdownLimitPct: round(cfg.max_drawdown_fraction * 100, 2),
    maxPositionLimitPct: round(cfg.max_position_fraction * 100, 2)
  };
}
async function loadData() {
  const results = await Promise.allSettled([
    getJSON(BASE + '/actions/workflows/papertrade-daily.yml/runs?branch=main&per_page=10'),
    getJSON(BASE + '/actions/workflows/papertrade-ci.yml/runs?per_page=8'),
    getJSON(EXCHANGE + '/products/BTC-USD/ticker'),
    getJSON(RAW_STATE)
  ]);
  const [scheduled, branchTests, quote, seed] = results;
  const ok = p => p.status === 'fulfilled';
  const runs = ok(scheduled) ? scheduled.value.workflow_runs.map(runSummary) : [];
  const testRuns = ok(branchTests) ? branchTests.value.workflow_runs.map(runSummary) : [];
  const errors = {};
  if (!ok(scheduled)) errors.workflow = String(scheduled.reason?.message || 'unavailable');
  if (!ok(branchTests)) errors.tests = String(branchTests.reason?.message || 'unavailable');
  if (!ok(quote)) errors.market = String(quote.reason?.message || 'unavailable');
  if (!ok(seed)) errors.ledger = String(seed.reason?.message || 'unavailable');
  let bars = null, portfolio = null;
  if (ok(seed)) {
    try {
      bars = await completedCandles(seed.value.last_date);
      portfolio = replay(seed.value, bars);
    } catch (e) {
      errors.replay = e.message || 'Replay unavailable';
    }
  }
  const q = ok(quote) ? quote.value : null;
  const spot = q && Number.isFinite(Number(q.price)) ? {
    price: Number(q.price),
    bid: Number(q.bid), ask: Number(q.ask),
    volume24h: Number(q.volume), quoteTime: q.time,
    source: 'Coinbase Exchange BTC-USD public ticker'
  } : null;
  const latest = runs[0] || null;
  const freshRun = latest && Date.now() - Date.parse(latest.started_at) < 48 * HOUR;
  return {
    generatedAt: new Date().toISOString(),
    platform: 'PERSONAL_PAPER_TRADING_RESEARCH',
    tradingMode: 'PAPER_ONLY',
    realOrders: 0,
    running24x7: false,
    dailySchedule: '12:17 UTC / 08:17 Guyana',
    operations: {latest, recent: runs.slice(0, 8), testRuns: testRuns.slice(0, 5),
      health: !latest ? 'UNAVAILABLE' : latest.status !== 'completed' ? 'RUNNING' :
        latest.conclusion !== 'success' ? 'FAILED' : freshRun ? 'HEALTHY' : 'STALE'},
    market: spot,
    priceHistory: bars ? bars.slice(-95).map(c => ({date: c.date, close: c.close})) : [],
    portfolio,
    research: {
      status: 'HISTORICAL_RESEARCH_NOT_VALIDATED',
      verifiedOn: '2026-11-01', dataThrough: '2026-10-31',
      folds: 12, trainDays: 180, testDays: 45,
      results: [
        {name: 'ML logistic baseline', meanFoldReturn: -0.7203, positiveFolds: 0, folds: 12},
        {name: 'Selected SMA strategy', meanFoldReturn: 0.3816, positiveFolds: 3, folds: 12},
        {name: 'Buy & hold benchmark', meanFoldReturn: 0.6846, positiveFolds: null, folds: 12}
      ],
      sourceRun: 'https://github.com/' + REPO + '/actions/runs/41358736461'
    },
    errors
  };
}
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({error: 'Only GET is supported'});
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=90');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    return res.status(200).json(await loadData());
  } catch(e) {
    return res.status(503).json({generatedAt: new Date().toISOString(), error: 'Data sources unavailable', detail: String(e.message || e)});
  }
};
