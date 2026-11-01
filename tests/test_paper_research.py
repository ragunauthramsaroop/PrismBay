import copy
import unittest
from dataclasses import replace

from papertrade.core import Config, synthetic_candles
from papertrade.ledger import advance, initialize, verify
from papertrade.walkforward import features, fit_model, predict, run_walkforward


class WalkForwardTests(unittest.TestCase):
    def setUp(self):
        self.bars = synthetic_candles(480)

    def test_ml_does_not_look_at_target_day_candle(self):
        base = features(self.bars, 250)
        day = self.bars[250]
        edited = self.bars.copy()
        edited[250] = replace(day, high=day.high * 10, close=day.high * 10)
        self.assertEqual(base, features(edited, 250))

    def test_training_does_not_use_future_bars(self):
        first = fit_model(self.bars, 180)
        altered = self.bars.copy()
        altered[-1] = replace(altered[-1], high=altered[-1].high * 10,
                              close=altered[-1].high * 10)
        self.assertEqual(first, fit_model(altered, 180))
        self.assertEqual(predict(first, self.bars, 180),
                         predict(first, altered, 180))

    def test_model_predicts_bounded_probability(self):
        model = fit_model(self.bars, 180)
        self.assertGreaterEqual(predict(model, self.bars, 200), 0)
        self.assertLessEqual(predict(model, self.bars, 200), 1)
        self.assertEqual(model["train_end_exclusive"], 180)

    def test_fold_boundaries_nonoverlap(self):
        report = run_walkforward(self.bars, train_days=180, test_days=45, max_folds=4)
        self.assertEqual(report["status"], "RESEARCH_ONLY_NOT_VALIDATED")
        self.assertEqual(report["fold_count"], 4)
        for i, fold in enumerate(report["folds"]):
            self.assertLess(fold["train_end"], fold["test_start"])
            self.assertEqual(fold["train_observations"], 180 - 21 + i * 45)
            if i:
                self.assertLess(report["folds"][i - 1]["test_end"], fold["test_start"])

    def test_walkforward_rejects_short_history(self):
        with self.assertRaises(ValueError):
            run_walkforward(self.bars[:190])


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.bars = synthetic_candles(365)

    def test_initialization_does_not_backfill_paper_trades(self):
        ledger = initialize(self.bars[:300])
        self.assertEqual(ledger["events"], [])
        self.assertEqual(ledger["cash"], 10000)
        self.assertEqual(ledger["last_date"], self.bars[299].date)
        self.assertEqual(ledger["mode"], "PAPER_ONLY")

    def test_advance_hash_chain_and_idempotence(self):
        ledger = initialize(self.bars[:300])
        updated = advance(self.bars[:306], ledger)
        self.assertEqual(len(updated["events"]), 6)
        verify(updated)
        self.assertEqual(updated, advance(self.bars[:306], updated))
        self.assertEqual(ledger["events"], [])

    def test_tamper_rejected(self):
        updated = advance(self.bars[:303], initialize(self.bars[:300]))
        forged = copy.deepcopy(updated)
        forged["events"][0]["equity"] = 9.0
        with self.assertRaises(ValueError):
            verify(forged)

    def test_cannot_skip_anchor(self):
        ledger = initialize(self.bars[:300])
        with self.assertRaises(ValueError):
            advance(self.bars[301:], ledger)

    def test_cannot_increase_position_beyond_cash(self):
        result = advance(self.bars[:360], initialize(self.bars[:300]))
        self.assertGreaterEqual(result["cash"], 0)
        self.assertGreaterEqual(result["units"], 0)
        self.assertEqual(result["mode"], "PAPER_ONLY")

    def test_one_day_rollover(self):
        ledger = initialize(self.bars[:300])
        updated = advance(self.bars[:301], ledger)
        self.assertEqual(updated["events"][0]["date"], self.bars[300].date)
        self.assertEqual(updated["events"][0]["kind"], "HISTORICAL_BAR_REPLAY")


if __name__ == "__main__":
    unittest.main()
