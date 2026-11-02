#!/usr/bin/env python3
"""Read-only validation of the provisional PACER narration timing plan.

Never authorizes publishing. No network, third-party API, or paid dependency.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / "youtube-growth/production/2026-11-02-pacer-provisional-narration-retiming.json"
SOURCE = ROOT / "youtube-growth/production/2026-11-02-pacer-longform-visual-storyboard.json"

def validate():
    p = json.loads(PLAN.read_text(encoding="utf-8"))
    s = json.loads(SOURCE.read_text(encoding="utf-8"))
    assert p["channel_id"] == s["channel_id"] == "UCw2hs85TzIpdKwJtG-BSxzQ"
    assert p["handle"] == s["handle"] == "@PrismBayAI"
    assert p["paid_spend_usd"] == 0
    assert not p["release_gates"]["public_upload_permitted"]
    assert not p["release_gates"]["real_narration_recording"]
    assert len(p["narration_sections"]) == 11
    assert len(p["proposed_scenes"]) == len(s["scenes"]) == 22
    assert sum(x["word_count"] for x in p["narration_sections"]) == 1246
    assert any(x["original_required_wpm"] > 180 for x in p["narration_sections"]), "Expected pacing defect not documented"
    assert all(x["proposed_required_wpm"] <= 150 for x in p["narration_sections"])
    cursor = 0
    for i, scene in enumerate(p["proposed_scenes"]):
        assert scene["scene"] == i + 1
        assert scene["start_s"] == cursor
        assert scene["end_s"] > scene["start_s"]
        assert scene["on_screen"] == s["scenes"][i]["on_screen"]
        assert scene["asset"] == f"pacer_scene_{i+1:02d}.svg"
        cursor = scene["end_s"]
    assert cursor == s["production"]["target_duration_seconds"] == 570
    for i, segment in enumerate(p["narration_sections"], start=1):
        shots = [x for x in p["proposed_scenes"] if x["script_section"] == i]
        assert shots
        assert shots[0]["start_s"] == segment["proposed_start_s"]
        assert shots[-1]["end_s"] == segment["proposed_end_s"]
        assert segment["proposed_window_s"] == segment["proposed_end_s"] - segment["proposed_start_s"]
    print("PASS: exact channel, 22 continuous scenes, 11 spoken segments, 570 seconds")
    print("PASS: original >180 WPM closing risk recorded; provisional sections <=150 WPM")
    print("NOT A RELEASE APPROVAL: measured narration, captions, rights and playback still pending")

if __name__ == "__main__":
    validate()
