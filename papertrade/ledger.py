"""Durable, deterministic paper ledger with hash-chained records. NO live order support."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import tempfile
from pathlib import Path
from .core import Candle, Config, synthetic_candles, validate_candles
from .market_data import fetch_coinbase_history

VERSION = 1
ROOT_HASH = "0" * 64


def _event_hash(previous: str, event: dict) -> str:
    payload = json.dumps(event, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256((previous + payload).encode()).hexdigest()


def initialize(candles: list[Candle], config: Config = Config()) -> dict:
    """Begin prospective paper observation AFTER last completed candle, with no historical fills."""
    config.validate()
    validate_candles(candles)
    if len(candles) < config.slow_window:
        raise ValueError("Need enough history to initialize a prospective ledger")
    return {
        "version": VERSION, "mode": "PAPER_ONLY", "fill_status": "REPLAYED_BAR_APPROXIMATION",
        "started_after_candle": candles[-1].date, "last_date": candles[-1].date,
        "cash": config.initial_cash, "units": 0.0, "entry_price": 0.0,
        "fees": 0.0, "max_equity": config.initial_cash, "halted": False,
        "last_equity": config.initial_cash, "last_hash": ROOT_HASH,
        "config": {
            "fast_window": config.fast_window, "slow_window": config.slow_window,
            "max_position_fraction": config.max_position_fraction,
            "fee_bps": config.fee_bps, "slippage_bps": config.slippage_bps,
            "stop_loss_fraction": config.stop_loss_fraction,
            "max_drawdown_fraction": config.max_drawdown_fraction,
            "daily_loss_fraction": config.daily_loss_fraction
        },
        "events": []
    }


def verify(ledger: dict) -> None:
    if ledger.get("version") != VERSION or ledger.get("mode") != "PAPER_ONLY":
        raise ValueError("Invalid ledger version or mode")
    events = ledger.get("events")
    if not isinstance(events, list):
        raise ValueError("Invalid ledger events")
    prior = ROOT_HASH
    last_date = ledger["started_after_candle"]
    for record in events:
        event = {k: v for k, v in record.items() if k not in ("prev_hash", "hash")}
        if record["prev_hash"] != prior or record["hash"] != _event_hash(prior, event):
            raise ValueError("Ledger event hash mismatch")
        if record["date"] <= last_date:
            raise ValueError("Ledger events must be strictly increasing")
        prior = record["hash"]
        last_date = record["date"]
    if ledger["last_hash"] != prior or ledger["last_date"] != last_date:
        raise ValueError("Ledger head or date mismatch")
    for name in ("cash", "units", "entry_price", "fees", "max_equity", "last_equity"):
        val = ledger[name]
        if not isinstance(val, (int, float)) or not math.isfinite(val) or val < 0:
            raise ValueError(f"Invalid ledger value: {name}")


def advance(candles: list[Candle], ledger: dict) -> dict:
    """Append each completed candle once. Every execution is historical OHLCV replay."""
    validate_candles(candles)
    verify(ledger)
    old_last = ledger["last_date"]
    indices = {c.date: i for i, c in enumerate(candles)}
    if old_last not in indices:
        raise ValueError("Ledger anchor is missing from supplied historical data")
    cfg = Config(initial_cash=max(ledger["last_equity"], 0.01), **ledger["config"])
    cfg.validate()
    copy = json.loads(json.dumps(ledger))
    start = indices[old_last] + 1
    for i in range(start, len(candles)):
        day = candles[i]
        if i < cfg.slow_window:
            raise ValueError("Not enough previous candles to calculate signal")
        cash = copy["cash"]
        units = copy["units"]
        entry = copy["entry_price"]
        fee_rate = cfg.fee_bps / 10000
        slip = cfg.slippage_bps / 10000
        decision = "HOLD"
        fee_paid = 0.0
        signal_fast = sum(c.close for c in candles[i - cfg.fast_window:i]) / cfg.fast_window
        signal_slow = sum(c.close for c in candles[i - cfg.slow_window:i]) / cfg.slow_window
        opening_equity = cash + units * day.open
        previous_equity = copy["last_equity"]
        daily_open_loss = (previous_equity - opening_equity) / previous_equity if previous_equity > 0 else 0
        dd_open = (copy["max_equity"] - opening_equity) / copy["max_equity"]
        blocked = copy["halted"] or daily_open_loss >= cfg.daily_loss_fraction or dd_open >= cfg.max_drawdown_fraction

        def sell(market_price: float, why: str) -> None:
            nonlocal cash, units, entry, decision, fee_paid
            if units <= 0:
                return
            execution = market_price * (1 - slip)
            proceeds = units * execution
            trade_fee = proceeds * fee_rate
            cash += proceeds - trade_fee
            fee_paid += trade_fee
            units = 0.0
            entry = 0.0
            decision = why

        if blocked:
            sell(day.open, "RISK_GATE_SELL")
            if copy["halted"] or dd_open >= cfg.max_drawdown_fraction:
                copy["halted"] = True
        elif units > 0 and signal_fast < signal_slow:
            sell(day.open, "TREND_SELL")
        elif units <= 0 and signal_fast > signal_slow:
            budget = min(cash, (cash + units * day.open) * cfg.max_position_fraction)
            price = day.open * (1 + slip)
            qty = budget / (price * (1 + fee_rate))
            if qty > 0:
                trade_fee = qty * price * fee_rate
                cash -= qty * price + trade_fee
                units += qty
                entry = price
                fee_paid += trade_fee
                decision = "TREND_BUY"
        if units > 0 and day.low <= entry * (1 - cfg.stop_loss_fraction):
            stop_price = min(day.open, entry * (1 - cfg.stop_loss_fraction))
            sell(stop_price, "INTRADAY_STOP_APPROX")
        equity = cash + units * day.close
        copy["max_equity"] = max(copy["max_equity"], equity)
        dd_close = (copy["max_equity"] - equity) / copy["max_equity"]
        if dd_close >= cfg.max_drawdown_fraction:
            copy["halted"] = True
        if cash < -1e-7 or units < 0:
            raise AssertionError("No leverage or short positions permitted")
        cash = max(0.0, cash)
        copy["cash"] = cash
        copy["units"] = units
        copy["entry_price"] = entry
        copy["fees"] += fee_paid
        copy["last_equity"] = equity
        copy["last_date"] = day.date
        event = {
            "date": day.date, "kind": "HISTORICAL_BAR_REPLAY",
            "decision": decision, "fast_signal": round(signal_fast, 5),
            "slow_signal": round(signal_slow, 5),
            "cash": round(cash, 8), "units": round(units, 12),
            "equity": round(equity, 8), "daily_fees": round(fee_paid, 8),
            "halted": copy["halted"], "drawdown_pct": round(dd_close * 100, 4)
        }
        record_hash = _event_hash(copy["last_hash"], event)
        event["prev_hash"] = copy["last_hash"]
        event["hash"] = record_hash
        copy["events"].append(event)
        copy["last_hash"] = event["hash"]
    verify(copy)
    return copy


def save_atomic(path: Path, state: dict) -> None:
    """Write locally via atomic rename; CI artifacts alone are not permanent shared storage."""
    verify(state)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".ledger-", suffix=".json", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            json.dump(state, out, indent=2, allow_nan=False)
            out.write("\n")
            out.flush()
            os.fsync(out.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def main() -> None:
    parser = argparse.ArgumentParser(description="Paper-only ledger. No authenticated endpoints.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--demo", action="store_true")
    group.add_argument("--coinbase", action="store_true")
    parser.add_argument("--history-days", type=int, default=360)
    parser.add_argument("--state", required=True, type=Path)
    args = parser.parse_args()
    candles = synthetic_candles() if args.demo else fetch_coinbase_history(args.history_days)
    if args.state.exists():
        state = json.loads(args.state.read_text(encoding="utf-8"))
        updated = advance(candles, state)
        new_count = len(updated["events"]) - len(state["events"])
    else:
        updated = initialize(candles)
        new_count = 0
    save_atomic(args.state, updated)
    print("PAPER_LEDGER_STATUS=" + json.dumps({
        "mode": "PAPER_ONLY", "last_date": updated["last_date"],
        "started_after_candle": updated["started_after_candle"],
        "entries": len(updated["events"]), "new_entries": new_count,
        "ending_equity": round(updated["last_equity"], 2),
        "halted": updated["halted"], "last_hash": updated["last_hash"]
    }, sort_keys=True))


if __name__ == "__main__":
    main()
