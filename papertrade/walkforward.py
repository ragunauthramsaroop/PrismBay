"""Leakage-controlled walk-forward research. No orders, accounts, or fitted live models."""
from __future__ import annotations

import math
import statistics
from dataclasses import asdict, replace
from typing import Sequence
from .core import Candle, Config, simulate, validate_candles

WINDOWS = ((5, 20), (10, 30), (20, 50), (30, 90))
FEATURE_LOOKBACK = 21


def features(candles: Sequence[Candle], day_index: int) -> tuple[float, ...]:
    """Predict day_index from prices available strictly before its open."""
    if day_index < FEATURE_LOOKBACK:
        raise ValueError("Insufficient historical feature lookback")
    p = [c.close for c in candles]
    prior = p[day_index - 1]
    recent = [math.log(p[k] / p[k - 1]) for k in range(day_index - 10, day_index)]
    return (
        math.log(prior / p[day_index - 2]),
        math.log(prior / p[day_index - 6]),
        math.log(prior / p[day_index - 21]),
        statistics.pstdev(recent),
        (candles[day_index - 1].high - candles[day_index - 1].low) / prior,
    )


def fit_model(candles: Sequence[Candle], end: int, epochs: int = 160) -> dict:
    """L2-regularized logistic regression, fit using only labeled days before end."""
    if end < FEATURE_LOOKBACK + 45 or end > len(candles):
        raise ValueError("Insufficient training observations")
    x = [features(candles, i) for i in range(FEATURE_LOOKBACK, end)]
    y = [int(candles[i].close > candles[i].open) for i in range(FEATURE_LOOKBACK, end)]
    means = [statistics.mean(col) for col in zip(*x)]
    scales = [max(statistics.pstdev(col), 1e-9) for col in zip(*x)]
    scaled = [tuple((v - means[j]) / scales[j] for j, v in enumerate(row)) for row in x]
    weights = [0.0] * len(means)
    positive_rate = (sum(y) + 1) / (len(y) + 2)
    bias = math.log(positive_rate / (1 - positive_rate))
    n = len(y)
    for _ in range(epochs):
        grad = [0.0] * len(weights)
        grad_bias = 0.0
        for row, target in zip(scaled, y):
            z = max(-30.0, min(30.0, bias + sum(w * v for w, v in zip(weights, row))))
            err = 1 / (1 + math.exp(-z)) - target
            for j, v in enumerate(row):
                grad[j] += err * v
            grad_bias += err
        learning_rate = 0.15
        for j in range(len(weights)):
            weights[j] -= learning_rate * (grad[j] / n + 0.02 * weights[j])
        bias -= learning_rate * grad_bias / n
    return {"model": "train-only-l2-logistic", "train_end_exclusive": end, "weights": weights,
            "bias": bias, "means": means, "scales": scales, "training_count": n}


def predict(model: dict, candles: Sequence[Candle], day_index: int) -> float:
    row = features(candles, day_index)
    z = model["bias"] + sum(
        w * ((value - model["means"][j]) / model["scales"][j])
        for j, (w, value) in enumerate(zip(model["weights"], row))
    )
    return 1 / (1 + math.exp(-max(-30, min(30, z))))


def test_ml_fold(candles: Sequence[Candle], start: int, end: int, model: dict,
                 fee_bps: float = 15, slip_bps: float = 10) -> dict:
    """Isolated open-to-close test with only previous-close ML features.
    Exit model approximates end-of-day paper fills, not real market orders.
    """
    fee = fee_bps / 10000
    slip = slip_bps / 10000
    equity = 10000.0
    peak = equity
    max_dd = 0.0
    total_fees = 0.0
    trades = 0
    wins = 0
    halted = False
    for i in range(start, end):
        if halted:
            continue
        probability = predict(model, candles, i)
        if probability < 0.57:
            continue
        day = candles[i]
        stake = equity * 0.10
        buy_price = day.open * (1 + slip)
        quantity = stake / (buy_price * (1 + fee))
        spent = quantity * buy_price * (1 + fee)
        sell_market = max(day.low, min(day.close, buy_price * 0.95))
        # Daily-bar stop: pessimistic open-to-low assumption if price hits stop.
        if day.low <= buy_price * 0.95:
            sell_market = buy_price * 0.95
        sell_price = sell_market * (1 - slip)
        proceeds = quantity * sell_price * (1 - fee)
        realized = proceeds - spent
        total_fees += quantity * buy_price * fee + quantity * sell_price * fee
        equity += realized
        trades += 1
        wins += int(realized > 0)
        peak = max(peak, equity)
        max_dd = max(max_dd, (peak - equity) / peak)
        if max_dd >= 0.10:
            halted = True
    return {"return_pct": round((equity / 10000 - 1) * 100, 4),
            "drawdown_pct": round(max_dd * 100, 4), "trades": trades,
            "wins": wins, "fees": round(total_fees, 4), "halted": halted}


def run_walkforward(candles: Sequence[Candle], train_days: int = 180,
                    test_days: int = 45, config: Config = Config(),
                    max_folds: int = 12) -> dict:
    """Fixed non-overlapping out-of-sample folds. Candidate selection uses TRAIN ONLY."""
    config.validate()
    validate_candles(candles)
    if train_days < 120 or test_days < 15 or max_folds < 1:
        raise ValueError("Walk-forward sample sizes invalid")
    if len(candles) < train_days + test_days:
        raise ValueError("Need enough daily candles for at least one complete fold")

    folds = []
    for end_training in range(train_days, len(candles) - test_days + 1, test_days):
        if len(folds) >= max_folds:
            break
        begin_test = end_training
        end_test = end_training + test_days
        scores = []
        for fast, slow in WINDOWS:
            if train_days <= slow:
                continue
            cfg = replace(config, fast_window=fast, slow_window=slow)
            train_sim = simulate(candles[end_training - train_days:end_training], cfg)
            train_ret = train_sim["summary"]["return_pct"]
            train_dd = train_sim["summary"]["max_drawdown_pct"]
            scores.append((train_ret - 0.5 * train_dd, fast, slow))
        scores.sort(reverse=True)
        best = scores[0] if scores and scores[0][0] > 0 else None
        if best is None:
            sma_result = {"selected": "CASH", "train_score": 0.0,
                          "return_pct": 0.0, "trades": 0}
        else:
            _, fast, slow = best
            cfg = replace(config, fast_window=fast, slow_window=slow)
            # Replay from train start through test end. The boundary equity is
            # marked to market; all test decisions only see earlier closes.
            replay = simulate(candles[end_training - train_days:end_test], cfg)
            cut = train_days - 1
            before = replay["equity_curve"][cut]["equity"]
            after = replay["equity_curve"][-1]["equity"]
            test_trades = [t for t in replay["trades"]
                           if t["date"] >= candles[begin_test].date]
            sma_result = {
                "selected": f"SMA({fast},{slow})", "train_score": round(best[0], 4),
                "return_pct": round((after / before - 1) * 100, 4),
                "trades": len(test_trades)
            }
        model = fit_model(candles, end_training)
        ml = test_ml_fold(candles, begin_test, end_test, model,
                          config.fee_bps, config.slippage_bps)
        benchmark = ((candles[end_test - 1].close / candles[begin_test].open) - 1) * 100
        folds.append({
            "train_start": candles[end_training - train_days].date,
            "train_end": candles[end_training - 1].date,
            "test_start": candles[begin_test].date,
            "test_end": candles[end_test - 1].date,
            "train_observations": model["training_count"],
            "sma": sma_result, "ml": ml,
            "buy_hold_pct": round(benchmark, 4),
        })
    if not folds:
        raise ValueError("No complete folds")
    return {
        "status": "RESEARCH_ONLY_NOT_VALIDATED",
        "mode": "HISTORICAL_OUT_OF_SAMPLE_REPLAY",
        "model": "Train-only L2 logistic; prior-close predictors; 57% long threshold",
        "method": "Anchored expanding ML train; non-overlapping fixed-length OOS; "
                  "SMA tuned within prior rolling train window only",
        "assumptions": asdict(config),
        "train_days": train_days, "test_days": test_days,
        "fold_count": len(folds),
        "summary": {
            "mean_ml_return_pct": round(statistics.mean(x["ml"]["return_pct"] for x in folds), 4),
            "mean_sma_return_pct": round(statistics.mean(x["sma"]["return_pct"] for x in folds), 4),
            "mean_buy_hold_pct": round(statistics.mean(x["buy_hold_pct"] for x in folds), 4),
            "ml_positive_folds": sum(x["ml"]["return_pct"] > 0 for x in folds),
            "sma_positive_folds": sum(x["sma"]["return_pct"] > 0 for x in folds)
        },
        "folds": folds,
        "limitations": [
            "This research is not live trading or evidence of predictive alpha.",
            "Market open and close are approximations; spreads, outages and execution delays are not modeled fully.",
            "OOS fold results are independent; do not treat average or stitched returns as deployable performance.",
            "A model trained on price-only data has not been independently validated for trading."
        ]
    }
