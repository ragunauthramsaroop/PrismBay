# Personal Paper Trading Research Lab

Status: PAPER ONLY. Zero real-money orders, no exchange or broker credentials, no deposits, withdrawals, leverage, margin, paid infrastructure, or trading API adapter. This is a personal research experiment, unrelated to AGM Inc. or any employer.

## Verified architecture, November 1, 2026

- Source: public experimental branch `experiment/ai-paper-trading` of `ragunauthramsaroop/PrismBay`, with no production application changes.
- Scheduler: separate read-only workflow `.github/workflows/papertrade-daily.yml` on the default branch, merged via reviewed PR #570. Runs daily at 12:17 UTC (08:17 Guyana time). GitHub's scheduler may delay or skip runs, so confirm status.
- Permissions: `contents: read` only. No GitHub secrets, broker APIs, financial accounts or write access.
- Executed source: daily job checks out `experiment/ai-paper-trading` and runs 21 paper-only unit tests.
- Data: public BTC-USD completed UTC daily OHLCV candles from Coinbase Exchange. History fetched in requests of up to 200 days. No accounts accessed.
- Research: run a train-only L2 logistic model with features lagged to the previous close, then evaluate independent 45-day out-of-sample folds. Compare to moving-average strategies selected only on prior training data and to buy-and-hold.
- Paper ledger: `papertrade/ledger.py` initializes $10,000 simulated cash after the last completed candle. Future daily market bars advance a deterministic, hash-chained replay ledger. A new replay trade is not evidence of an order placed in real time.
- Rolling storage: GitHub Actions cache restores the most recent successful state and saves the updated state with a new unique run key. A separate report artifact is kept for 30 days. Caches and artifacts are subject to retention and eviction, so this is a rolling operational record, NOT an indefinite archive. The job stops if the state is corrupt or more than four UTC days stale.
- Production remains separate. Tracker: https://github.com/ragunauthramsaroop/PrismBay/issues/569. Successful first main-branch scheduled-workflow test: https://github.com/ragunauthramsaroop/PrismBay/actions/runs/41359282702.

## Verified research results

Historical data from May 15, 2024, to October 31, 2026. Across 12 held-out 45-day folds:
- Machine-learning model mean return per fold: -0.7203%; positive folds: 0/12.
- Selected moving-average method mean return per fold: +0.3816%; positive folds: 3/12.
- Mean buy-and-hold return per fold: +0.6846%.
These are **not** comparable to continuous portfolio returns, do not establish profitability, and provide no basis for live capital deployment.

## Reproduce locally

Python 3.11+; no pip dependencies.

- `python -m unittest discover -s tests -p 'test_core.py' -v`
- `python -m unittest discover -s tests -p 'test_paper_research.py' -v`
- `python -m papertrade --coinbase --out artifacts/history`
- `python -m papertrade.research_cli --coinbase --history-days 900 --out artifacts/research`
- `python -m papertrade.ledger --coinbase --history-days 900 --state artifacts/local-ledger.json`

The ledger only initializes on its first run and starts updating when a newer completed UTC candle becomes available. The user must not call this live trading or account activity.

## Required before even considering live funds

1. At least 60 verified forward observation days with stable, complete daily records and independent performance comparisons.
2. Evidence of net after-cost outperformance across market regimes, and forward performance that remains positive when fees and slippage worsen.
3. Live execution analysis of spreads, actual bid/ask fills, API failures, downtime, custody, reconciliation, circuit breakers and drawdown gates.
4. Legitimate broker or exchange availability to a Guyana-based account holder, compliance review, loss budget and tax review.
5. Separate private repository and a professionally reviewed execution service, with trading-only withdrawal-disabled keys.
6. New explicit owner authorization for every live exchange integration and real-money order. No such authorization has been granted.

## Known limitations and safety

No AI has been validated to produce profits. No GPU or external inference API is involved; the machine-learning model is a small, train-only research baseline. The simulated OHLCV execution and stop-loss modeling are approximations and cannot protect capital in live markets. The cache is not a banking ledger. This project must not merge the experimental trading source into production, and must not accept financial credentials in this public repository. The five ChatGPT scheduled-task slots were already occupied, so GitHub Actions implements the daily read-only research schedule without replacing other tasks.
