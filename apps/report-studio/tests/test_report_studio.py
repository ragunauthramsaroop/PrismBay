"""Offline regression tests for report compilation and publication gates."""
import copy
import json
import tempfile
import unittest
from pathlib import Path

from report_studio import ReportError, build, extract_sources, inspect, read_manifest, validate

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "projects" / "demo.json"


class StudioTests(unittest.TestCase):
    def setUp(self):
        self.doc = read_manifest(SAMPLE)

    def test_demo_manifest_passes(self):
        self.assertEqual(validate(self.doc, SAMPLE), [])

    def test_pdf_build_and_inspection(self):
        with tempfile.TemporaryDirectory() as td:
            result = build(SAMPLE, Path(td) / "sample.pdf")
            self.assertGreaterEqual(result["pages"], 5)
            self.assertTrue(result["a4_pages"])
            self.assertTrue(result["has_sources"])
            self.assertFalse(result["blank_pages"])

    def test_unverified_production_source_blocks(self):
        self.doc["meta"]["demonstration"] = False
        self.assertIn("not verified", " ".join(validate(self.doc, SAMPLE)))

    def test_unknown_reference_blocks(self):
        self.doc["pages"][0]["paragraphs"][0]["source_ids"] = ["MISSING"]
        self.assertIn("missing source reference", " ".join(validate(self.doc, SAMPLE)))

    def test_duplicate_sources_block(self):
        self.doc["sources"].append(copy.deepcopy(self.doc["sources"][0]))
        self.assertIn("duplicate source ID", " ".join(validate(self.doc, SAMPLE)))

    def test_photo_requires_rights_and_existing_file(self):
        self.doc["pages"].append({
            "type": "photo", "title": "Community", "image": "../../private.jpg",
            "caption": "Photo", "credit": "Owner", "alt_text": "People",
            "rights": "unknown", "source_ids": ["DEMO01"]
        })
        issues = " ".join(validate(self.doc, SAMPLE))
        self.assertIn("image missing or outside", issues)
        self.assertIn("requires owned or licensed", issues)

    def test_long_narrative_continues_not_clips(self):
        self.doc["pages"][0]["paragraphs"][0]["text"] = ("An illustrative paragraph with fictional reporting details. " * 110)
        with tempfile.TemporaryDirectory() as td:
            manifest = Path(td) / "long.json"
            manifest.write_text(json.dumps(self.doc), encoding="utf-8")
            report = build(manifest, Path(td) / "long.pdf")
            self.assertGreater(report["pages"], 5)

    def test_local_text_extraction_with_sha(self):
        with tempfile.TemporaryDirectory() as td:
            src = Path(td) / "source"
            src.mkdir()
            (src / "example.txt").write_text("Local example only", encoding="utf-8")
            records = extract_sources(src, Path(td) / "output")
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["verification"], "pending_human_review")
            self.assertTrue((Path(td) / "output" / "inventory.json").exists())


if __name__ == "__main__":
    unittest.main()
