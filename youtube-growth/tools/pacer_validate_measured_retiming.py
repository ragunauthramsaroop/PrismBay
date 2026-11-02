#!/usr/bin/env python3
"""Validate the measured, private P-A-C-E-R timing plan. No publication actions."""
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / "youtube-growth/production/2026-11-02-pacer-measured-kokoro-605s-retiming.json"
SOURCE = ROOT / "youtube-growth/production/2026-11-02-pacer-sentence-aligned-voiceover-cues.json"
CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"

def main():
    p = json.loads(PLAN.read_text(encoding="utf-8"))
    src_bytes = SOURCE.read_bytes()
    src = json.loads(src_bytes)
    assert p["channel_id"] == src["channel_id"] == CHANNEL
    assert p["handle"] == src["handle"] == "@PrismBayAI"
    assert str(p["metricool_brand_id"]) == str(src["metricool_brand_id"]) == "6945443"
    assert p["narration_source_sha256"] == hashlib.sha256(src_bytes).hexdigest()
    assert p["original_narration_words"] == src["total_narration_words"] == 1246
    assert p["prior_estimated_duration_s"] == 570
    assert p["paid_spend_usd"] == 0
    assert p["release_gates"]["public_upload_permitted"] is False
    assert p["release_gates"]["full_listening"] is False
    assert p["release_gates"]["word_level_caption_sync"] is False
    assert len(p["scenes"]) == len(src["scenes"]) == 22
    assert p["source_artifact_id"] == 13156983246
    assert len(p["source_artifact_zip_sha256"]) == 64
    cursor = 0
    speech_total = 0.0
    pause_total = 0.0
    for idx, (scene, original) in enumerate(zip(p["scenes"], src["scenes"]), 1):
        assert scene["scene"] == original["scene"] == idx
        assert scene["prior_570s_slot_s"] == original["duration_s"]
        assert scene["start_s"] == cursor
        measured = scene["measured_speech_s"]
        slot = math.ceil(measured + 1.5)
        assert scene["slot_s"] == slot
        assert scene["end_s"] == cursor + slot
        assert 1.5 <= scene["post_speech_pause_s"] < 2.501
        assert abs(scene["post_speech_pause_s"] - (slot - measured)) < 0.002
        speech_total += measured
        pause_total += scene["post_speech_pause_s"]
        cursor += slot
    assert cursor == p["measured_retimed_duration_s"] == 605
    assert abs(speech_total - p["measured_speech_total_s"]) < 0.01
    assert abs(pause_total - p["added_pause_total_s"]) < 0.01
    assert abs(speech_total + pause_total - cursor) < 0.01
    assert p["preview"]["video_and_audio_duration_s"] == cursor
    assert p["preview"]["video_fps"] == 1
    print("PASS: 22 measured scenes, 1246 words, 605 seconds, no overruns, no publication.")

if __name__ == "__main__":
    main()
