# Gold-only strategy research program

Status as of November 1, 2026: **PAPER RESEARCH ONLY. NOT APPROVED FOR LIVE ORDERS.**

This project is personal research, unrelated to AGM Inc. The sole instrument is XAU/USD, measured in USD per troy ounce. Existing live virtual account settings are unchanged until a separate, reviewed decision. No broker accounts, keys, deposits, withdrawals, auto-funding, leverage or real orders.

## Scientific rationale

The initial hypothesis is a long-only time-series trend-following strategy, based on the documented persistence of returns in commodity futures. Research on diversified futures does **not** establish profitability for one retail XAU/USD product, at five-minute intervals or with its broker-specific costs. Volatility scaling merits independent comparison because the literature disputes whether trend-signal alpha survives this control.

Public references:
- Moskowitz, Ooi & Pedersen (2012), "Time series momentum," Journal of Financial Economics: https://doi.org/10.1016/j.jfineco.2011.11.003
- Kim, Tse & Wald (2016), "Time series momentum and volatility scaling," Financial Markets and Portfolio Management: https://www.sciencedirect.com/science/article/pii/S1386418116301379
- XAUS data contract: https://xaus.com/api/

## Independent research streams

### Five-minute intraday hypothesis

Source: XAUS public XAU chart proxy. Approximately five days of observed records. A small, deterministic logistic model uses lagged returns and volatility. Comparison candidates: 8/21 moving-average trend, 12/36 trend, 18-bar breakout, trained logistic baseline, and stay-in-cash. Walk-forward: 300+ past bars, independent 90-bar test windows. Cash competes against each strategy in training. Results in this limited sample, 2026-11-01:
- 1,059 gold chart bars over 5.89 calendar days, 8 held-out windows
- Mean return per held-out window **-0.00648%** after assumed transaction costs; **0/8** positive
- Double-cost mean **-0.01281%**
- Cash selected in 7/8 training windows
- **No trading edge demonstrated**

### Five-year daily swing hypothesis

Source: XAUS public daily gold history. Approximately 1,258 reported daily closes and daily high/low ranges. **Daily open prices are not supplied.** Never construct synthetic open prices or misrepresent daily-close values as executable broker fills. A daily signal from the last recorded close is evaluated against a *hypothetical later daily close* as a proxy. Real-world market-on-close fills, dealing spreads, financing and gap execution are not known.

Candidate models: 20/60-day trend, 50/200-day trend, 55-day high breakout with 20-day exit, trained L2 logistic baseline, and stay-in-cash. Chronological training window: at least 504 trading observations. Held-out non-overlapping windows: 63 observations each. Each test starts at a fresh $10,000 virtual balance with 10% maximum notional exposure.

First five-year historical sample, 2026-11-01:
- 1,258 daily close records across 4.99 years, 11 out-of-sample test windows
- Trained candidate selector mean virtual return per test window **+0.5845%**; **6/11** positive windows
- Double transaction cost scenario **+0.5072%**
- Fixed 20/60 daily trend comparison **+0.6407%**, stronger in this sample than candidate selection
- The sample includes a strong gold bull period. The results do **not** demonstrate robust risk-adjusted excess return, nor prove future performance.

**Current research candidate:** A simple **20/60-day long-only trend filter with volatility and downside controls**, for further tests. It is not selected for real orders. The logistic model does not outperform the fixed daily trend comparison in the current limited study.

## Execution and risk rules tested

- Long-only, XAU/USD gold; no shorts, derivatives or leverage in the research simulator.
- Simulated exposure cap 10% of account equity per entry; virtual initial equity $10,000.
- Assumed costs per side: 15 basis points fee, 10 basis points slippage, 0.5 basis point spread. Double-cost scenario is required.
- Prior-bar signals must be processed only after that bar is complete; independent test data never enters model fitting or candidate selection.
- Simulation applies virtual stops and portfolio drawdown limits; daily data cannot model intraday fills or guaranteed stop prices.
- A candidate is not automatically promoted when a backtest is positive.
- Daily GitHub workflow generates a read-only gold research artifact and sends no orders.

## Real-money promotion gate (not yet satisfied)

1. Acquire a longer, licensed XAU/USD dataset with actual broker or venue bid/ask, daily opens, commissions, financing, and gaps across multiple rate and volatility regimes. Verify permitted local access and instrument suitability for a Guyana-based client.
2. Repeat nested walk-forward tests and a separately locked final holdout, with alternative price sources and parameter sensitivity tests. Benchmark against 10%-allocation buy-and-hold and volatility-matched exposure.
3. Demonstrate significant *net* advantage above transaction and financing costs, with loss/drawdown and tail-event resilience during adverse regimes. If no edge emerges, remain in cash.
4. Run at least 60 independently timestamped forward paper observation days, preserving missing-data gaps, broker quote snapshots, reconciliation, and durable immutable logs.
5. Perform a separate operational, cybersecurity, exchange/broker legal, taxation, suitability, and risk-budget review. Trading-only API keys must never permit withdrawals.
6. Obtain **new explicit owner authorization** for any broker integration and *any* real-money order. No standing authorization exists.

## Operational links

- Dashboard: https://papertrade-research-live.vercel.app/?tab=strategies
- Gold-only scheduled paper study: https://github.com/ragunauthramsaroop/PrismBay/actions/workflows/papertrade-daily.yml
- Tracker: https://github.com/ragunauthramsaroop/PrismBay/issues/569

All displayed returns are *averages of separate reset-to-cash held-out windows*, **not** compounded portfolio returns. Historical proxy prices do not establish executable broker outcomes.
