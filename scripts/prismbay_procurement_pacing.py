#!/usr/bin/env python3
"""Offline, idempotent pacing repair for one unpublished PrismBay AI Short.
No publication or scheduling. Captions are provisional until listening QA.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
FACTOR = 1.20

def cmd(*args):
    return subprocess.check_output(args, text=True).strip()

def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1048576), b""):
            h.update(block)
    return h.hexdigest()

def duration(path):
    return float(cmd("ffprobe", "-v", "error", "-show_entries",
                     "format=duration", "-of",
                     "default=noprint_wrappers=1:nokey=1", str(path)))

def stamp(seconds):
    ms = round(seconds * 1000)
    hh, ms = divmod(ms, 3600000)
    mm, ms = divmod(ms, 60000)
    ss, ms = divmod(ms, 1000)
    return f"{hh:02d}:{mm:02d}:{ss:02d},{ms:03d}"

def candidate(spec, seconds):
    words = " ".join(s["spoken"].strip() for s in spec["segments"]).split()
    groups = []
    i = 0
    while i < len(words):
        count = min(5, len(words) - i)
        if len(words) - i - count == 1:
            count += 1
        groups.append(words[i:i + count])
        i += count
    assert [w for group in groups for w in group] == words
    lines = []
    measures = []
    seen = 0
    for index, group in enumerate(groups, 1):
        start = seconds * seen / len(words)
        seen += len(group)
        end = seconds * seen / len(words)
        wpm = 60 * len(group) / (end - start)
        if wpm > 160 or end - start < 1.5:
            raise ValueError(f"Caption pacing failure: cue {index}: {wpm:.2f} WPM")
        lines.append(f"{index}\n{stamp(start)} --> {stamp(end)}\n{' '.join(group)}\n")
        measures.append({"cue": index, "words": len(group),
                         "durationSeconds": round(end - start, 3),
                         "wpm": round(wpm, 2)})
    return "\n".join(lines) + "\n", measures, len(words)

def main():
    parser = argparse.ArgumentParser()
    for key in ("video", "manifest", "spec", "captions", "report"):
        parser.add_argument("--" + key, required=True, type=Path)
    a = parser.parse_args()
    manifest = json.loads(a.manifest.read_text())
    spec = json.loads(a.spec.read_text())
    assert manifest["channelId"] == CHANNEL == spec["targetChannelId"]
    assert manifest["published"] is False and manifest["publicationApproved"] is False
    assert manifest["uploadPermitted"] is False and manifest["paidSpend"] == 0
    assert spec["publicationApproved"] is False and spec["uploadPermitted"] is False
    assert spec["paidSpendUSD"] == 0
    before_sha = sha(a.video)
    assert before_sha == manifest["sha256"], "Media hash differs from manifest"
    previous_factor = float(manifest.get("pacedFactor", 1.0))
    if abs(previous_factor - FACTOR) < 0.0001:
        print("Target pacing already applied. No duplicate rendering.")
        return
    assert previous_factor in (1.0, 1.10), "Unexpected prior pacing; refuse reprocessing"
    incremental_factor = FACTOR / previous_factor
    old_seconds = duration(a.video)
    with tempfile.TemporaryDirectory(dir=a.video.parent) as temp:
        output = Path(temp) / "paced.mp4"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(a.video),
            "-filter_complex",
            f"[0:v]setpts={incremental_factor}*PTS,fps=30[v];[0:a]atempo={1/incremental_factor:.9f}[a]",
            "-map", "[v]", "-map", "[a]", "-c:v", "libx264",
            "-preset", "medium", "-crf", "20", "-c:a", "aac",
            "-b:a", "160k", "-movflags", "+faststart",
            "-pix_fmt", "yuv420p", str(output)
        ], check=True)
        new_seconds = duration(output)
        assert old_seconds * incremental_factor * 0.98 <= new_seconds <= old_seconds * incremental_factor * 1.02
        srt, measures, word_count = candidate(spec, new_seconds)
        after_sha = sha(output)
        output.replace(a.video)
    a.captions.parent.mkdir(parents=True, exist_ok=True)
    a.report.parent.mkdir(parents=True, exist_ok=True)
    a.captions.write_text(srt)
    report = {
        "targetChannelId": CHANNEL,
        "originalSeconds": round(old_seconds / previous_factor, 3),
        "previousSeconds": round(old_seconds, 3),
        "incrementalFactor": round(incremental_factor, 6),
        "pacedSeconds": round(new_seconds, 3),
        "speedFactor": FACTOR,
        "originalSha256": manifest.get("originalSha256", manifest.get("previousSha256", before_sha)),
        "pacedSha256": after_sha,
        "captionWordCount": word_count,
        "captionCueCount": len(measures),
        "maxCaptionWPM": max(x["wpm"] for x in measures),
        "cuesOver160WPM": sum(x["wpm"] > 160 for x in measures),
        "cuesUnder1_5Seconds": sum(x["durationSeconds"] < 1.5 for x in measures),
        "captionTiming": "PROPORTIONAL_EDITORIAL_CANDIDATE_NOT_WORD_ALIGNED",
        "fullNarrationListening": "NOT_PERFORMED",
        "mobilePlaybackReview": "NOT_PERFORMED",
        "publicationApproved": False,
        "uploadPermitted": False,
        "published": False,
        "paidSpendUSD": 0,
        "releaseDecision": "HOLD_PENDING_AUDIO_CAPTION_MOBILE_REVIEW",
        "cueMetrics": measures
    }
    a.report.write_text(json.dumps(report, indent=2) + "\n")
    manifest.update({
        "sha256": after_sha, "previousSha256": before_sha,
        "originalSha256": manifest.get("originalSha256", manifest.get("previousSha256", before_sha)),
        "pacedFactor": FACTOR,
        "captionsCandidatePath": str(a.captions),
        "qualityGate": "CLOSED_PENDING_FULL_AUDIO_CAPTION_MOBILE_QA"
    })
    a.manifest.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "cueMetrics"}, indent=2))

if __name__ == "__main__":
    main()
