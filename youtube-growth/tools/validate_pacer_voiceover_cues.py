#!/usr/bin/env python3
"""Validate original P-A-C-E-R narration coverage and estimated scene timing.

Read-only quality gate. No TTS, upload, scheduling, or public publishing.
All timings remain estimates until actual narration is measured and reviewed.
"""
import argparse
import json
import re
from pathlib import Path

AUTHORIZED_CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CUES = ROOT / "youtube-growth/production/2026-11-02-pacer-sentence-aligned-voiceover-cues.json"
DEFAULT_MASTER = ROOT / "youtube-growth/production/2026-11-01-ai-agent-pacer-permission-gates-longform-master.md"

def normalize(s):
    return " ".join(s.split())

def narration_sections(master):
    text = master.read_text(encoding="utf-8")
    assert "## Full original narration" in text and "## Visual and editorial plan" in text
    block = text.split("## Full original narration", 1)[1].split("## Visual and editorial plan", 1)[0]
    return [
        normalize(match.group(1))
        for match in re.finditer(r"(?ms)^###\s+\d\d:\d\d\s+\|\s+[^\n]+\n(.*?)(?=^###\s+|\Z)", block)
    ]

def validate(cues_path=DEFAULT_CUES, master_path=DEFAULT_MASTER):
    cues = json.loads(cues_path.read_text(encoding="utf-8"))
    assert cues["channel_id"] == AUTHORIZED_CHANNEL and cues["handle"] == "@PrismBayAI"
    assert str(cues["metricool_brand_id"]) == "6945443"
    assert cues["paid_spend_usd"] == 0
    assert cues["status"].startswith("SENTENCE_ALIGNED_ESTIMATE")
    assert not any(cues["release_gates"].values()), "Never treat a timing estimate as release approval"
    scenes = cues["scenes"]
    chapters = cues["chapters"]
    source = narration_sections(master_path)
    assert len(source) == len(chapters) == 11
    assert len(scenes) == 22
    cursor = 0
    total_words = 0
    rates = []
    for index, scene in enumerate(scenes, start=1):
        assert scene["scene"] == index
        assert scene["start_s"] == cursor, "Gap or overlap in scene timeline"
        assert scene["end_s"] > cursor
        assert scene["duration_s"] == scene["end_s"] - cursor
        assert scene["script_section"] in range(1, 12)
        assert scene["asset"] == f"pacer_scene_{index:02d}.svg"
        text = scene["original_text"]
        assert text and normalize(text) == text
        count = len(text.split())
        assert count == scene["word_count"]
        rate = round(count * 60 / scene["duration_s"], 1)
        assert abs(rate - scene["estimated_wpm"]) <= 0.11
        assert 115 <= rate <= 150, f"Scene {index} has unreasonable estimated speech pace: {rate}"
        cursor = scene["end_s"]
        total_words += count
        rates.append(rate)
    assert cursor == cues["estimated_duration_s"] == 570
    assert total_words == cues["total_narration_words"] == 1246
    for section, original in enumerate(source, start=1):
        assigned = [s for s in scenes if s["script_section"] == section]
        assert assigned, f"Chapter {section} has no scenes"
        assert normalize(" ".join(s["original_text"] for s in assigned)) == original, (
            f"Chapter {section} lost or changed source narration"
        )
        chapter = chapters[section - 1]
        assert chapter["section"] == section
        assert chapter["word_count"] == len(original.split())
        assert chapter["scene_count"] == len(assigned)
        assert chapter["duration_s"] == sum(s["duration_s"] for s in assigned)
    print(json.dumps({
        "result": "PASS",
        "channel_id": AUTHORIZED_CHANNEL,
        "chapters": len(chapters),
        "scenes": len(scenes),
        "original_words_preserved": total_words,
        "estimated_duration_seconds": cursor,
        "minimum_scene_wpm": min(rates),
        "maximum_scene_wpm": max(rates),
        "narration_recorded": False,
        "publication_permitted": False,
        "paid_spend_usd": 0
    }, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cues", type=Path, default=DEFAULT_CUES)
    parser.add_argument("--master", type=Path, default=DEFAULT_MASTER)
    args = parser.parse_args()
    validate(args.cues, args.master)
