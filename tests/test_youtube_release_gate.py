"""Regression tests for the sole-channel PrismBay AI read-only media gate."""
import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("youtube_release_gate", ROOT / "scripts/youtube_release_gate.py")
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

GOOD = {
    "channelId": "UCw2hs85TzIpdKwJtG-BSxzQ",
    "published": False,
    "publicationApproved": False,
    "uploadPermitted": False,
    "paidSpend": 0,
    "sha256": "a" * 64,
}

class ReleaseGateTests(unittest.TestCase):
    def test_valid_unpublished_manifest(self):
        gate.validate_manifest(GOOD)

    def test_manifest_fails_closed(self):
        cases = [
            {"channelId": "another-channel"},
            {"published": True},
            {"publicationApproved": True},
            {"uploadPermitted": True},
            {"uploadPermitted": None},
            {"paidSpend": 1},
            {"paidSpend": None},
            {"sha256": None},
        ]
        for change in cases:
            with self.subTest(change=change), self.assertRaises(ValueError):
                gate.validate_manifest({**GOOD, **change})

    def test_srt_valid_and_invalid(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "captions.srt"
            p.write_text("1\n00:00:00,000 --> 00:00:02,000\nHello world\n")
            self.assertEqual(gate.read_srt(p), [(0.0, 2.0, 2)])
            for bad in ("", "1\n00:00:02,000 --> 00:00:01,000\nReverse\n",
                        "1\n00:00:00,000 --> 00:00:02,000\n"):
                p.write_text(bad)
                with self.subTest(bad=bad), self.assertRaises(ValueError):
                    gate.read_srt(p)

    def test_manifest_sha256_is_enforced_and_never_approves_upload(self):
        def fake_run(*args):
            if args[0] == "ffprobe":
                return (json.dumps({"streams": [
                    {"codec_type": "video", "codec_name": "h264", "width": 1080, "height": 1920},
                    {"codec_type": "audio", "codec_name": "aac"}],
                    "format": {"duration": "12.0"}}), "")
            if "silencedetect" in " ".join(args):
                return ("", "Peak level dB: -3.0")
            return ("", "")
        with tempfile.TemporaryDirectory() as d:
            base = Path(d)
            video = base / "synthetic.mp4"
            video.write_bytes(b"synthetic test fixture")
            captions = base / "captions.srt"
            captions.write_text("1\n00:00:00,000 --> 00:00:12,000\nHello world\n")
            manifest = base / "manifest.json"
            report = base / "report.json"
            argv = ["gate", "--video", str(video), "--srt", str(captions),
                    "--manifest", str(manifest), "--report", str(report)]
            with patch.object(gate, "run", fake_run), patch.object(sys, "argv", argv):
                manifest.write_text(json.dumps({**GOOD, "sha256": "0" * 64}))
                with self.assertRaises(SystemExit) as cm:
                    gate.main()
                self.assertEqual(cm.exception.code, 2)
                self.assertIn("SHA256 mismatch", json.loads(report.read_text())["technicalIssues"])
                manifest.write_text(json.dumps({**GOOD, "sha256": hashlib.sha256(video.read_bytes()).hexdigest()}))
                gate.main()
                result = json.loads(report.read_text())
                self.assertTrue(result["technicalChecksPass"])
                self.assertFalse(result["publicationApproved"])
                self.assertFalse(result["uploadPermitted"])

    def test_longform_gate_requires_landscape_and_never_approves(self):
        def fake_run(*args):
            if args[0] == "ffprobe":
                return (json.dumps({"streams": [
                    {"codec_type": "video", "codec_name": "h264", "width": 1920, "height": 1080},
                    {"codec_type": "audio", "codec_name": "aac"}],
                    "format": {"duration": "64.0"}}), "")
            if "silencedetect" in " ".join(args):
                return ("", "Peak level dB: -3.0")
            return ("", "")
        with tempfile.TemporaryDirectory() as d:
            base = Path(d)
            video = base / "longform.mp4"
            video.write_bytes(b"synthetic landscape test fixture")
            captions = base / "captions.srt"
            captions.write_text("1\n00:00:00,000 --> 00:00:04,000\nLong form review\n\n2\n00:01:01,000 --> 00:01:04,000\nClosing caption\n")
            manifest = base / "manifest.json"
            report = base / "report.json"
            manifest.write_text(json.dumps({**GOOD, "sha256": hashlib.sha256(video.read_bytes()).hexdigest()}))
            args = ["gate", "--format", "longform", "--video", str(video), "--srt", str(captions),
                    "--manifest", str(manifest), "--report", str(report)]
            with patch.object(gate, "run", fake_run), patch.object(sys, "argv", args):
                gate.main()
                result = json.loads(report.read_text())
                self.assertTrue(result["technicalChecksPass"])
                self.assertEqual(result["format"], "longform")
                self.assertEqual(result["resolution"], [1920, 1080])
                self.assertFalse(result["publicationApproved"])
                self.assertFalse(result["uploadPermitted"])
                # A long-form export with only opening subtitles must fail closed.
                captions.write_text("1\n00:00:00,000 --> 00:00:04,000\nLong form review\n")
                with self.assertRaises(SystemExit) as missing_tail:
                    gate.main()
                self.assertEqual(missing_tail.exception.code, 2)
                self.assertIn("Uncaptioned tail exceeds 30 seconds",
                              json.loads(report.read_text())["technicalIssues"])
            args[2] = "shorts"
            with patch.object(gate, "run", fake_run), patch.object(sys, "argv", args):
                with self.assertRaises(SystemExit) as error:
                    gate.main()
                self.assertEqual(error.exception.code, 2)
                self.assertIn("1080x1920 Shorts frame required",
                              json.loads(report.read_text())["technicalIssues"])

if __name__ == "__main__":
    unittest.main()
