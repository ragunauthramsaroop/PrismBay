"""Run the paper-only OHLCV research simulator."""
import argparse
import csv
import json
from pathlib import Path
from .core import Config, load_csv, simulate, synthetic_candles
from .market_data import fetch_coinbase_daily


def main() -> None:
    parser = argparse.ArgumentParser(description="PAPER-ONLY daily research engine. Absolutely no real orders.")
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument("--demo", action="store_true", help="Artificial data for code testing, NEVER a performance claim")
    inputs.add_argument("--csv", help="Existing daily OHLCV CSV: date,open,high,low,close,volume")
    inputs.add_argument("--coinbase", action="store_true", help="Public BTC-USD daily market data, no account connection")
    parser.add_argument("--out", default="artifacts", help="Directory for JSON and CSV reports")
    args = parser.parse_args()
    source = "SYNTHETIC_TEST_ONLY" if args.demo else "COINBASE_PUBLIC_BTC_USD" if args.coinbase else "USER_CSV_UNVERIFIED"
    candles = synthetic_candles() if args.demo else fetch_coinbase_daily() if args.coinbase else load_csv(args.csv)
    result = simulate(candles, Config())
    result["data_source"] = source
    result["not_financial_advice"] = True
    result["not_proof_of_profitability"] = True
    result["started"] = candles[0].date
    result["ended"] = candles[-1].date
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    for filename, key, fields in [
        ("trades.csv", "trades", ["date", "action", "price", "quantity", "fee", "reason", "cash_after", "realized_pnl"]),
        ("equity.csv", "equity_curve", ["date", "equity", "drawdown_fraction"])
    ]:
        with (out / filename).open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()
            writer.writerows(result[key])
    print(json.dumps({"data_source": source, "summary": result["summary"], "report": str(out / "report.json")}, indent=2))


if __name__ == "__main__":
    main()
