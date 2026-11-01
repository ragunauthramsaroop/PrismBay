import unittest
from dataclasses import replace
from papertrade.core import Config, simulate, synthetic_candles, validate_candles


class PaperTradingTests(unittest.TestCase):
    def setUp(self):
        self.candles = synthetic_candles(250)

    def test_demo_runs_with_no_live_orders(self):
        result = simulate(self.candles)
        self.assertEqual(result["mode"], "PAPER_ONLY")
        self.assertEqual(len(result["equity_curve"]), 250)

    def test_no_margin_or_negative_cash(self):
        result = simulate(self.candles)
        self.assertTrue(all(t["cash_after"] >= 0 for t in result["trades"]))
        self.assertTrue(all(t["quantity"] > 0 for t in result["trades"]))

    def test_no_lookahead_last_bar_decision(self):
        base = simulate(self.candles)
        last = self.candles[-1]
        changed = self.candles[:-1] + [replace(last, high=max(last.high, last.close * 5), close=last.close * 5)]
        self.assertEqual(base["trades"], simulate(changed)["trades"])

    def test_fees_reduce_equity(self):
        zero = simulate(self.candles, Config(fee_bps=0, slippage_bps=0))
        costly = simulate(self.candles, Config(fee_bps=100, slippage_bps=100))
        self.assertGreater(zero["summary"]["ending_equity"], costly["summary"]["ending_equity"])

    def test_bad_ohlc_rejected(self):
        with self.assertRaises(ValueError):
            validate_candles([replace(self.candles[0], high=1)] + self.candles[1:])

    def test_duplicate_dates_rejected(self):
        candles = self.candles.copy()
        candles[1] = replace(candles[1], date=candles[0].date)
        with self.assertRaises(ValueError):
            simulate(candles)

    def test_invalid_risk_config_rejected(self):
        with self.assertRaises(ValueError):
            simulate(self.candles, Config(max_position_fraction=1.2))

    def test_short_input_rejected(self):
        with self.assertRaises(ValueError):
            simulate(self.candles[:50])

    def test_maximum_position_entry_cap(self):
        result = simulate(self.candles, Config(max_position_fraction=0.05))
        for trade in result["trades"]:
            if trade["action"] == "BUY":
                self.assertGreater(trade["cash_after"], 0)

    def test_no_orders_or_account_apis_present(self):
        from papertrade.market_data import PUBLIC_ENDPOINT
        self.assertIn("/candles", PUBLIC_ENDPOINT)
        self.assertNotIn("/orders", PUBLIC_ENDPOINT)


if __name__ == "__main__":
    unittest.main()
