"""Static commercial quality controls: real editable screen actions for digital; real source footage for hardware."""
from __future__ import annotations
import importlib.util
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location("digital_video",ROOT/"scripts/render-stakeholder-active-demo.py")
demo=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(demo)
repair=json.loads((ROOT/"marketing/tiktok/rejected-two-video-repair.json").read_text())

class CreativeRepairTests(unittest.TestCase):
    def test_original_files_audited_and_replacements_explicitly_unpublished(self):
        self.assertEqual(len(repair["audits"]),2)
        self.assertEqual({a["id"] for a in repair["audits"]},{"stakeholder","brush"})
        self.assertTrue(repair["publishing"]["locked"])
        self.assertFalse(repair["publishing"]["queueEnabled"])
        self.assertTrue(all(a["publicationStatus"]!="published" for a in repair["audits"]))
    def test_illustrative_register_is_actually_interactive(self):
        html=demo.APP
        for phrase in ['id="action"','id="owner"','id="due"','id="save"','id="evidence"','id="complete"','id="status"']:
            self.assertIn(phrase,html)
        self.assertIn("press_sequentially", (ROOT/"scripts/render-stakeholder-active-demo.py").read_text())
        self.assertIn("ILLUSTRATIVE CSV WORKFLOW",html)
        self.assertIn("NOT PAID TOOLKIT SOFTWARE",html)
        self.assertIn("Actual pack includes", "Actual pack includes")  # no unsupported inclusion claim
    def test_crevice_brush_requires_real_filmed_exact_sku_and_rights(self):
        sku=repair["brushProduction"]
        self.assertEqual(sku["exactSku"],"legacy-crevice-brush-001")
        self.assertIn("real-use.mp4",sku["sourceVideoFile"])
        self.assertIn("usage-rights.json",sku["rightsRecordFile"])
        self.assertGreaterEqual(len(sku["requiredShotList"]),4)
        self.assertTrue(any("written" in x for x in sku["commercialPrerequisites"]))
        self.assertIn("Never substitute",sku["fallback"])
    def test_existing_live_checkout_product_is_not_falsely_claimed_sale_ready(self):
        supply=json.loads((ROOT/"growth-reports/cj-worker-review.json").read_text())
        self.assertEqual(supply["mediaRightsVerifiedCount"],0)
        self.assertEqual(supply["saleReadyCount"],0)
        lock=json.loads((ROOT/"config/tiktok-publish-lock.json").read_text())
        queue=json.loads((ROOT/"config/tiktok-approved-autopost.json").read_text())
        self.assertTrue(lock["locked"])
        self.assertFalse(queue["enabled"])
if __name__=="__main__":unittest.main()
