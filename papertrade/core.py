"""Offline, spot-only, long-only research simulator. NEVER sends live orders."""
from __future__ import annotations

import csv
import math
from dataclasses import asdict, dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True)
class Candle:
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass(frozen=True)
class Config:
    fast_window: int = 20
    slow_window: int = 50
    initial_cash: float = 10000.0
    max_position_fraction: float = 0.15
    fee_bps: float = 15.0
    slippage_bps: float = 10.0
    stop_loss_fraction: float = 0.05
    max_drawdown_fraction: float = 0.10
    daily_loss_fraction: float = 0.025

    def validate(self) -> None:
        if not (1 <= self.fast_window < self.slow_window):
            raise ValueError("Require 1 <= fast_window < slow_window")
        if not math.isfinite(self.initial_cash) or self.initial_cash <= 0:
            raise ValueError("initial_cash must be positive and finite")
        for name in ("max_position_fraction", "stop_loss_fraction", "max_drawdown_fraction", "daily_loss_fraction"):
            value = getattr(self, name)
            if not math.isfinite(value) or not 0 < value < 1:
                raise ValueError(f"{name} must be between 0 and 1")
        for name in ("fee_bps", "slippage_bps"):
            value = getattr(self, name)
            if not math.isfinite(value) or not 0 <= value <= 1000:
                raise ValueError(f"{name} must be between 0 and 1000 bps")


def validate_candles(candles: Sequence[Candle]) -> None:
    last = None
    for index, c in enumerate(candles):
        day = date.fromisoformat(c.date)
        if last is not None and day <= last:
            raise ValueError(f"Dates must be strictly increasing: row {index}")
        last = day
        for field in ("open", "high", "low", "close", "volume"):
            value = getattr(c, field)
            if not math.isfinite(value) or value < 0 or (field != "volume" and value <= 0):
                raise ValueError(f"Invalid {field} at {c.date}")
        if c.high < max(c.open, c.close) or c.low > min(c.open, c.close) or c.high < c.low:
            raise ValueError(f"Inconsistent OHLC at {c.date}")


def load_csv(path: str | Path) -> list[Candle]:
    with open(path, encoding="utf-8", newline="") as handle:
        rows = csv.DictReader(handle)
        required = {"date", "open", "high", "low", "close", "volume"}
        if not required.issubset(rows.fieldnames or []):
            raise ValueError(f"CSV requires columns: {', '.join(sorted(required))}")
        candles = [Candle(r["date"], *(float(r[k]) for k in ("open", "high", "low", "close", "volume"))) for r in rows]
    validate_candles(candles)
    return candles


def synthetic_candles(count: int = 365) -> list[Candle]:
    """Deterministic made-up data for software smoke testing, NOT profitability evidence."""
    if count < 60:
        raise ValueError("At least 60 candles required")
    start = date(2025, 1, 1)
    price = 100.0
    out = []
    for i in range(count):
        change = (0.0018 if i % 120 < 85 else -0.003) + 0.008 * math.sin(i * 0.35)
        new_price = price * (1 + change)
        high = max(price, new_price) * 1.007
        low = min(price, new_price) * 0.993
        out.append(Candle(str(start + timedelta(days=i)), price, high, low, new_price, 1000 + i))
        price = new_price
    return out


def simulate(candles: Sequence[Candle], config: Config = Config()) -> dict:
    """Signal from previous close, execution at next open. Approximate OHLC bar fills."""
    config.validate()
    validate_candles(candles)
    if len(candles) <= config.slow_window:
        raise ValueError("Need more candles than the slow_window")

    cash = config.initial_cash
    units = 0.0
    entry_total = 0.0
    entry_price = 0.0
    peak_equity = cash
    max_drawdown = 0.0
    fees = 0.0
    wins = 0
    completed = 0
    halted = False
    trades = []
    equity_curve = []
    fee_rate = config.fee_bps / 10000.0
    slip_rate = config.slippage_bps / 10000.0
    closes = [c.close for c in candles]
    previous_close_equity = config.initial_cash

    def sell(day: str, market_price: float, reason: str) -> None:
        nonlocal cash, units, entry_price, entry_total, completed, wins, fees
        if units <= 0:
            return
        actual_price = market_price * (1 - slip_rate)
        proceeds = units * actual_price
        fee = proceeds * fee_rate
        cash += proceeds - fee
        fees += fee
        pnl = proceeds - fee - entry_total
        wins += int(pnl > 0)
        completed += 1
        trades.append({"date": day, "action": "SELL", "price": round(actual_price, 8), "quantity": round(units, 12), "fee": round(fee, 8), "reason": reason, "cash_after": round(cash, 8), "realized_pnl": round(pnl, 8)})
        units = 0.0
        entry_price = 0.0
        entry_total = 0.0

    for i, candle in enumerate(candles):
        # Previous closes only determine today's opening-price signal.
        at_open = cash + units * candle.open
        day_loss = (previous_close_equity - at_open) / previous_close_equity if previous_close_equity > 0 else 0
        peak_equity = max(peak_equity, at_open)
        open_dd = (peak_equity - at_open) / peak_equity
        if halted or open_dd >= config.max_drawdown_fraction:
            sell(candle.date, candle.open, "MAX_DRAWDOWN_HALT")
            halted = True
        elif day_loss >= config.daily_loss_fraction:
            sell(candle.date, candle.open, "DAILY_LOSS_GATE")
        else:
            exited_today = False
            if units > 0:
                stop = entry_price * (1 - config.stop_loss_fraction)
                if candle.open <= stop:
                    sell(candle.date, candle.open, "STOP_GAP_OPEN")
                    exited_today = True
                elif candle.low <= stop:
                    sell(candle.date, stop, "STOP_INTRADAY_APPROX")
                    exited_today = True
            if i >= config.slow_window and not halted and not exited_today:
                fast = sum(closes[i - config.fast_window:i]) / config.fast_window
                slow = sum(closes[i - config.slow_window:i]) / config.slow_window
                if units > 0 and fast < slow:
                    sell(candle.date, candle.open, "TREND_EXIT")
                elif units == 0 and fast > slow:
                    buy_price = candle.open * (1 + slip_rate)
                    budget = min(cash, (cash + units * candle.open) * config.max_position_fraction)
                    quantity = budget / (buy_price * (1 + fee_rate))
                    if quantity > 0:
                        cost = quantity * buy_price
                        fee = cost * fee_rate
                        cash -= cost + fee
                        if cash < -1e-7:
                            raise AssertionError("No borrowing allowed")
                        cash = max(cash, 0.0)
                        units = quantity
                        entry_price = buy_price
                        entry_total = cost + fee
                        fees += fee
                        trades.append({"date": candle.date, "action": "BUY", "price": round(buy_price, 8), "quantity": round(quantity, 12), "fee": round(fee, 8), "reason": "PREVIOUS_CLOSE_TREND", "cash_after": round(cash, 8), "realized_pnl": None})

        end_equity = cash + units * candle.close
        peak_equity = max(peak_equity, end_equity)
        current_dd = (peak_equity - end_equity) / peak_equity
        max_drawdown = max(max_drawdown, current_dd)
        # End-of-day drawdown triggers liquidation at the next bar open.
        if current_dd >= config.max_drawdown_fraction:
            halted = True
        equity_curve.append({"date": candle.date, "equity": round(end_equity, 8), "drawdown_fraction": round(current_dd, 8)})
        previous_close_equity = end_equity

    ending_equity = cash + units * candles[-1].close
    return {
        "mode": "PAPER_ONLY", "data_source": "user_supplied_or_simulated", "assumptions": {
            "signal_lag": "Previous daily close, enter/exit at next open",
            "fill_model": "Simplified OHLC daily stop fills. Not suitable for live execution.",
            "funding": "Cash-only spot, no shorting, leverage, or borrowing", "config": asdict(config)
        },
        "summary": {"starting_equity": round(config.initial_cash, 2), "ending_equity": round(ending_equity, 2),
                    "return_pct": round((ending_equity / config.initial_cash - 1) * 100, 3),
                    "buy_and_hold_return_pct": round((candles[-1].close / candles[0].open - 1) * 100, 3),
                    "max_drawdown_pct": round(max_drawdown * 100, 3),
                    "completed_trades": completed, "winning_trades": wins, "total_fees": round(fees, 2),
                    "held_units": round(units, 12), "halted": halted},
        "trades": trades, "equity_curve": equity_curve,
    }
