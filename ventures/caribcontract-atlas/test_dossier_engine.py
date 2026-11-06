"""Offline unit tests. Never contact the portal or process customer data."""
import json
from pathlib import Path
import tempfile
import unittest

import dossier_engine as d


def sample():
    return {
        "project_id": "PROC-2026-00509",
        "project_name": "Supply and Delivery of Test Road Ambulances",
        "agency": "21-Ministry of Health",
        "projected_bid_opening_date": "2026-11-26",
        "advertisement_date": "2026-10-16",
        "regions": ["Region 04"],
        "procurement_nature": "Goods",
        "procurement_method": "Open Tendered",
        "advertisement_documents": [
            {"document_name": "Example", "document_file": "/files/example-test.pdf"}
        ],
    }


class DossierEngineTest(unittest.TestCase):
    def test_normalize_official_data_with_exact_source(self):
        data = d.normalize_tender(sample())
        self.assertEqual(data["id"], "PROC-2026-00509")
        self.assertEqual(data["agency"], "Ministry of Health")
        self.assertEqual(data["document_url"], "https://eprocure.gov.gy/files/example-test.pdf")
        self.assertEqual(data["advertised_opening"], "2026-11-26")

    def test_missing_official_document_fails_closed(self):
        row = sample()
        row["advertisement_documents"] = []
        with self.assertRaises(d.SourceError):
            d.normalize_tender(row)

    def test_rejects_host_spoofing(self):
        for value in (
            "https://eprocure.gov.gy.evil.example/files/a.pdf",
            "http://eprocure.gov.gy/files/a.pdf",
            "https://victim.invalid/files/a.pdf",
            "https://user:pass@eprocure.gov.gy/files/a.pdf",
        ):
            with self.subTest(value=value):
                self.assertFalse(d.is_official_url(value))

    def test_document_file_does_not_escape_official_host(self):
        for value in ("//evil.example/file.pdf", "/redirect/a.pdf",
                      "http://evil.example/files/a.pdf", "/files/malware.exe"):
            with self.subTest(value=value):
                with self.assertRaises(d.SourceError):
                    d.official_pdf_url(value)

    def test_select_requires_matching_source_id(self):
        row = sample()
        self.assertEqual(d.select_tender([row], "PROC-2026-00509")["agency"], "Ministry of Health")
        with self.assertRaises(d.SourceError):
            d.select_tender([row], "PROC-2026-55555")
        with self.assertRaises(d.SourceError):
            d.select_tender([row, row], "PROC-2026-00509")
        with self.assertRaises(d.SourceError):
            d.select_tender([row], "../../private")

    def test_advertised_opening_is_never_described_as_submission_deadline(self):
        row = d.normalize_tender(sample())
        data = d.compose_report(row, ["This is a test bid document. " * 30], current=d.date(2026, 11, 5))
        self.assertEqual(data["quality_gate"], "candidate_needs_human_review")
        self.assertTrue(any("NOT independently verified" in x for x in data["limitations"]))
        self.assertEqual(data["business_days_to_advertised_opening"], 15)

    def test_unreadable_pdfs_cannot_pass_review_gate(self):
        row = d.normalize_tender(sample())
        for pdf in ([], [""], ["no searchable text"]):
            with self.subTest(pdf=pdf):
                data = d.compose_report(row, pdf, current=d.date(2026, 11, 5))
                self.assertEqual(data["quality_gate"], "source_text_insufficient")
                self.assertEqual(data["source_sha256"], "")

    def test_document_evidence_stays_page_bound_and_nonbinding(self):
        text = (
            "The official test advertisement lists bidder qualification notes. "
            "A requested bid security is discussed separately on page two. "
            "All details remain subject to the complete bidding documents."
        )
        entries = d.evidence_matrix(["No matching text.", text])
        found = [x for x in entries if x["evidence"]]
        self.assertGreaterEqual(len(found), 1)
        self.assertEqual(found[0]["evidence"]["page"], 2)
        for item in entries:
            self.assertTrue("not confirmed" in item["status"].lower() or "check original" in item["status"].lower())
            if item["evidence"]:
                self.assertLessEqual(len(item["evidence"]["excerpt"].split()), 18)

    def test_html_template_escapes_untrusted_source_labels(self):
        row = d.normalize_tender(sample())
        row["title"] = "<script>alert('x')</script>"
        report = d.compose_report(row, ["Tender registration is required. " * 25], current=d.date(2026, 11, 5))
        with tempfile.TemporaryDirectory() as temp:
            html_path, json_path, text_path = d.write_artifacts(report, Path(temp))
            html = html_path.read_text(encoding="utf-8")
            self.assertNotIn("<script>", html)
            self.assertIn("&lt;script&gt;", html)
            self.assertIn("PROC-2026-00509", json_path.read_text(encoding="utf-8"))
            self.assertIn("NO", text_path.read_text(encoding="utf-8").upper())

    def test_report_artifacts_have_no_email_or_checkout_data(self):
        row = d.normalize_tender(sample())
        report = d.compose_report(row, ["Test technical specifications and delivery location. " * 18], current=d.date(2026, 11, 5))
        self.assertNotIn("email", json.dumps(report).lower())
        self.assertNotIn("checkout_session", json.dumps(report).lower())

    def test_guyana_calendar_has_no_past_workdays(self):
        self.assertEqual(d.business_days_until("2026-11-05", d.date(2026, 11, 5)), 0)
        self.assertEqual(d.business_days_until("2026-11-04", d.date(2026, 11, 5)), 0)
        self.assertEqual(d.business_days_until("2026-11-10", d.date(2026, 11, 5)), 3)


if __name__ == "__main__":
    unittest.main()
