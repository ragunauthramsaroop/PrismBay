# Aurora Paper Trading Lab (Research Only)

STATUS: PAPER ONLY. No broker credentials, no exchange authentication, no deposits, no withdrawals, and no real order endpoint.

This isolated experimental branch is a standalone Python research simulator. Do not merge it into the existing PrismBay production branches. This is not a strategy with established returns or an AI that trades independently. The connected GitHub application cannot create a new private repository. The current experiment branch is PUBLIC, so do not commit secrets or account data. Move it to a private repository before expanding the work.

## Quick start

Python 3.11 or newer. No third-party dependencies.

- Run all tests: python -m unittest discover -s tests -v
- Synthetic system smoke test: python -m papertrade --demo --out artifacts/papertrade-demo
- Public BTC-USD daily historical feed: python -m papertrade --coinbase --out artifacts/papertrade-coinbase
- Local CSV daily candles: python -m papertrade --csv mydata.csv --out artifacts/mydata

CSV input: date,open,high,low,close,volume with ascending YYYY-MM-DD dates and completed daily OHLCV candles. Demo candles are fabricated exclusively to test software. Never treat demo returns as real historical performance or a forecast.

## What the prototype measures

- An illustrative long-only SMA20/SMA50 trend signal using PREVIOUS closes, executed at next day's open.
- 15% maximum new position size, 5% per-position stop, 10% maximum equity drawdown halt, and a 2.5% daily opening-loss gate.
- No short positions, leverage, borrowing, deposits, or live orders.
- Assumed 15 bps transaction fees and 10 bps slippage on each side. Actual fees, market impact and latency differ.
- A basic close-only equity curve, transaction history, fee total, drawdown, and buy-and-hold comparison.
- Intraday daily-bar stop execution is approximate. Rapid market gaps or unavailable liquidity can exceed modeled losses.

## Evidence required before live funding

1. Clean history from different market conditions, fees, and symbol availability.
2. Walk-forward and held-out evaluation with realistic bid-ask spread, delays and execution failures.
3. At least 60 days of tracked paper trading against a fixed benchmark and hard stop rules.
4. Availability of a legitimate exchange or regulated broker for Guyana-based customers.
5. Independently reviewed security, kill switch, incident runbook, monitoring, withdrawal-disabled permissions and custody requirements.
6. Separate explicit approval before any brokerage connection or real-money execution code is added.

## Architecture

- papertrade/core.py: offline long-only simulator and risk gates.
- papertrade/market_data.py: unauthenticated read-only public price candles.
- papertrade/__main__.py: command-line runner and JSON/CSV result export.
- tests/test_core.py: ten automated checks on research safety and math.
- .github/workflows/papertrade-ci.yml: paper-only CI on this experimental branch. No scheduled live orders or secret access.

Research note: No AI model training, validated alpha, always-on trading server, or live deployment has been performed. Existing PrismBay workflows remain unchanged on the main branch.
