#!/usr/bin/env python3
"""Read-only validation of an unpublished PrismBay AI long-form SRT candidate.

This verifies text preservation and caption reading speed, not spoken-word sync,
narration quality, media rights, YouTube eligibility, or publication approval.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "youtube-growth/analytics/cost-controls-asr-qa"
CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
SOURCE_SHA256 = "c8da6a5fa46bb1e7ea9dfd6abf82b55d44b80d7fc63fdf515db7362d58be6a72"
TIMESTAMP = re.compile(r"^(\\d{2}):(\\d{2}):(\\d{2}),(\\d{3})$")


def seconds(value: str) -> float:
    match = TIMESTAMP.fullmatch(value.strip())
    if not match:
        raise ValueError(f"Invalid timestamp: {value!r}")
    hours, minutes, secs, millis = map(int, match.groups())
    if minutes >= 60 or secs >= 60:
        raise ValueError(f"Invalid clock time: {value!r}")
    return hours * 3600 + minutes * 60 + secs + millis / 1000


def parse_srt(content: str) -> list[dict]:
    cues = []
    for block in re.split(r"\\n\\s*\\n", content.strip()):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if len(lines) < 3 or " --> " not in lines[1]:
            raise ValueError("Malformed SRT cue")
        start_raw, end_raw = lines[1].split(" --> ", 1)
        start, end = seconds(start_raw), seconds(end_raw)
        text = " ".join(lines[2:])
        if end <= start or not text:
            raise ValueError("Empty text or invalid duration")
        cues.append({"index": int(lines[0]), "start": start, "end": end, "text": text})
    return cues


def verify(cues: list[dict], expected: list[dict], report: dict) -> dict:
    if len(cues) != len(expected) or len(cues) != 134:
        raise ValueError("Unexpected cue count or missing original captions")
    if report.get("channelId") != CHANNEL or report.get("sourceVideoSha256") != SOURCE_SHA256:
        raise ValueError("Source video or sole channel mismatch")
    if report.get("publicationApproved") is not False or report.get("uploadPermitted") is not False:
        raise ValueError("Publication must remain prohibited")
    if report.get("machineAlignedCandidateOnly") is not True:
        raise ValueError("Machine-aligned candidate status missing")
    max_wpm, min_duration = 0.0, float("inf")
    for index, (cue, original) in enumerate(zip(cues, expected), start=1):
        if cue["index"] != index or int(original["cue"]) != index:
            raise ValueError(f"Cue order mismatch at {index}")
        normalize = lambda s: re.sub(r"\\s+", " ", s).strip()
        if normalize(cue["text"]) != normalize(original["text"]):
            raise ValueError(f"Caption wording changed at cue {index}")
        if index > 1 and cue["start"] < cues[index - 2]["end"] - 0.001:
            raise ValueError(f"Caption overlap at cue {index}")
        duration = cue["end"] - cue["start"]
        min_duration = min(min_duration, duration)
        wpm = len(cue["text"].split()) * 60 / duration
        max_wpm = max(max_wpm, wpm)
        if duration < 1.5 - 0.001 or wpm > 160.01:
            raise ValueError(f"Caption pacing failure at cue {index}: {wpm:.2f} WPM")
    if abs(cues[0]["start"]) > 0.001 or abs(cues[-1]["end"] - 559.503) > 0.002:
        raise ValueError("Subtitle timeline no longer matches source video")
    return {
        "channelId": CHANNEL,
        "sourceVideoSha256": SOURCE_SHA256,
        "cueCount": len(cues),
        "maxWpm": round(max_wpm, 3),
        "minDurationSeconds": round(min_duration, 3),
        "over160Wpm": 0,
        "overlaps": 0,
        "originalCaptionWordingPreserved": True,
        "technicalCandidateCheck": "PASS",
        "spokenWordSynchronization": "UNVERIFIED",
        "fullNarrationListening": "PENDING",
        "continuousMobilePlayback": "PENDING",
        "dependencyAndVoiceRights": "PENDING",
        "publicationApproved": False,
        "uploadPermitted": False,
        "paidSpendUSD": 0,
    }


def self_test() -> None:
    assert seconds("00:01:02,500") == 62.5
    for bad in ("00:61:00,000", "00:00:60,000", "not a time"):
        try:
            seconds(bad)
            raise AssertionError("Invalid timestamp accepted")
        except ValueError:
            pass
    sample = parse_srt("1\\n00:00:00,000 --> 00:00:02,000\\nTwo clear words\\n")
    assert len(sample) == 1 and sample[0]["text"] == "Two clear words"
    try:
        parse_srt("1\\n00:00:02,000 --> 00:00:01,000\\nBackwards\\n")
        raise AssertionError("Backwards cue accepted")
    except ValueError:
        pass


if __name__ == "__main__":
    self_test()
    cues = parse_srt((BASE / "captions-asr-candidate.srt").read_text(encoding="utf-8-sig"))
    with (BASE / "caption_asr_cues.csv").open(newline="", encoding="utf-8") as handle:
        original = list(csv.DictReader(handle))
    report = json.loads((BASE / "caption_retiming_report.json").read_text(encoding="utf-8"))
    print(json.dumps(verify(cues, original, report), indent=2))
