import copy
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("score_growth_cycle", Path(__file__).with_name("score_growth_cycle.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
BASE = {
    "channel_id": mod.CHANNEL, "brand_id": mod.BRAND,
    "evolution": {"daily_views": {"2026-10-01": 6, "2026-10-02": None}, "last_observed_subscribers": 7},
    "scheduled_posts": [{"id": 1, "channel_id": mod.CHANNEL, "draft": True, "auto_publish": False, "privacy": "private"}],
    "experiments": [{"id": "roi", "observed_metrics": None}],
    "release_candidates": [{"id": "longform", "release_state": "HOLD_EDITORIAL"}],
    "verified_public_upload_ids": []
}
class ScoreTests(unittest.TestCase):
    def test_missing_not_zero_and_draft_not_public(self):
        r = mod.score(BASE)
        self.assertEqual((r["observed_view_sum"], r["days_with_missing_view_data"]), (6, 1))
        self.assertFalse(r["view_sum_is_complete"])
        self.assertEqual(r["private_unpublished_draft_ids"], [1])
        self.assertEqual(r["public_uploads_verified_by_this_snapshot"], [])
        self.assertEqual(r["experiment_decisions"]["roi"], "HOLD_NO_VIDEO_LEVEL_DATA")
    def test_wrong_channel_rejected(self):
        b = copy.deepcopy(BASE)
        b["scheduled_posts"][0]["channel_id"] = "another-channel"
        with self.assertRaises(ValueError): mod.score(b)
    def test_wrong_brand_rejected(self):
        b = copy.deepcopy(BASE)
        b["brand_id"] = "not-the-brand"
        with self.assertRaises(ValueError): mod.score(b)
    def test_low_exposure_never_stop(self):
        b = copy.deepcopy(BASE)
        b["experiments"][0]["observed_metrics"] = {"impressions": 50, "views": 4, "ctr": .01, "average_view_duration_seconds": 10, "subscribers_gained": 0}
        self.assertEqual(mod.score(b)["experiment_decisions"]["roi"], "HOLD_INSUFFICIENT_EXPOSURE")
    def test_scale_requires_three_signals(self):
        b = copy.deepcopy(BASE)
        b["experiments"][0]["observed_metrics"] = {"impressions": 1000, "views": 200, "ctr": .07, "average_view_duration_seconds": 240, "subscribers_gained": 3}
        self.assertEqual(mod.score(b)["experiment_decisions"]["roi"], "SCALE_CANDIDATE_REQUIRES_BASELINE_REVIEW")
    def test_negative_views_rejected(self):
        b = copy.deepcopy(BASE)
        b["evolution"]["daily_views"]["2026-10-01"] = -1
        with self.assertRaises(ValueError): mod.score(b)
if __name__ == "__main__":
    unittest.main()
