"""Command-line research runner. Public data or synthetic test candles only."""
import argparse
import json
from pathlib import Path

from .core import Config, load_csv, synthetic_candles
from .market_data import fetch_coinbase_history
from .walkforward import run_walkforward


def main():
    parser = argparse.ArgumentParser(description="Leak-controlled ML research. PAPER ONLY.")
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--coinbase", action="store_true", help="Public BTC-USD daily candles")
    src.add_argument("--demo", action="store_true", help="Synthetic data, not evidence of profit")
    src.add_argument("--csv", help="User supplied historical daily OHLCV")
    parser.add_argument("--history-days", type=int, default=900)
    parser.add_argument("--train-days", type=int, default=180)
    parser.add_argument("--test-days", type=int, default=45)
    parser.add_argument("--out", type=Path, default=Path("artifacts/research"))
    args = parser.parse_args()
    candles = (fetch_coinbase_history(args.history_days) if args.coinbase else
               synthetic_candles(max(365, args.history_days)) if args.demo else load_csv(args.csv))
    report = run_walkforward(candles, train_days=args.train_days, test_days=args.test_days,
                             config=Config())
    report["data_source"] = ("COINBASE_PUBLIC_COMPLETED_BTC_USD" if args.coinbase else
                             "SYNTHETIC_SMOKE_TEST_ONLY" if args.demo else "USER_SUPPLIED_UNVERIFIED_CSV")
    report["date_start"] = candles[0].date
    report["date_end"] = candles[-1].date
    report["NOT_APPROVED_FOR_LIVE_TRADING"] = True
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "walkforward.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("WALKFORWARD_RESEARCH=" + json.dumps({
        "status": report["status"], "data_source": report["data_source"],
        "fold_count": report["fold_count"], "summary": report["summary"],
        "date_start": report["date_start"], "date_end": report["date_end"],
        "live_approved": False}, sort_keys=True))


if __name__ == "__main__":
    main()
