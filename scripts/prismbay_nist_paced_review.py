#!/usr/bin/env python3
"""Create a pitch-preserved NIST Short pacing review, never a public upload.

The 1.15x duration stretch allows the exact ASR-timed subtitle candidate to
stay under 160 WPM without moving word centers away from the spoken audio.
This produces an unpublished review artifact, not a release approval.
"""
import hashlib
import json
import re
import subprocess
from pathlib import Path

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
SLUG = "nist-agent-identity-revocation-2026-10-29"
FACTOR = 1.15
ROOT = Path("public/youtube")
QA = Path("youtube-growth/analytics/nist-agent-identity-qa")
OUT = Path("youtube-growth/analytics/nist-paced-review")


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def probe_duration(path):
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        text=True).strip())


def seconds(value):
    hours, minutes, rest = value.split(":")
    sec, ms = rest.split(",")
    return int(hours) * 3600 + int(minutes) * 60 + int(sec) + int(ms) / 1000


def timestamp(value):
    millis = round(value * 1000)
    hours, millis = divmod(millis, 3600000)
    minutes, millis = divmod(millis, 60000)
    sec, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{sec:02d},{millis:03d}"


def main():
    video = ROOT / (SLUG + ".mp4")
    manifest = json.loads((ROOT / (SLUG + ".json")).read_text())
    qa = json.loads((QA / "captions-asr-anchored-script-report.json").read_text())
    source_srt = QA / "captions-timing-first-review-only.srt"
    assert manifest["channelId"] == qa["channelId"] == CHANNEL
    assert manifest["published"] is False
    assert manifest["publicationApproved"] is False
    assert manifest["uploadPermitted"] is False
    assert manifest["paidSpend"] == 0
    assert sha256(video) == manifest["sha256"] == qa["sourceVideoSHA256"]
    diagnostic = qa["timingFirstDiagnostic"]
    assert diagnostic["status"] == "REVIEW_ONLY_NOT_RELEASE_APPROVED"
    assert diagnostic["asrAnchorWeight"] >= 0.95
    assert diagnostic["maximumSmoothedWordCenterDisplacementSeconds"] <= 0.15
    assert diagnostic["maximumWPM"] / FACTOR <= 160
    source_duration = probe_duration(video)
    OUT.mkdir(parents=True, exist_ok=True)
    output_video = OUT / (SLUG + "-paced-1p15-review-only.mp4")
    # The video uses original authored static diagrams; duplicate frames are
    # expected. Audio is slowed with FFmpeg atempo, preserving pitch.
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(video),
        "-filter_complex",
        f"[0:v]setpts={FACTOR}*(PTS-STARTPTS),fps=30[v];"
        f"[0:a]atempo={1/FACTOR:.9f}[a]",
        "-map", "[v]", "-map", "[a]", "-c:v", "libx264",
        "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
        str(output_video),
    ], check=True)
    output_duration = probe_duration(output_video)
    assert abs(output_duration - source_duration * FACTOR) < 0.40

    raw = source_srt.read_text()
    regex = re.compile(r"\d{2}:\d{2}:\d{2},\d{3}")
    revised = regex.sub(lambda m: timestamp(seconds(m.group()) * FACTOR), raw)
    output_srt = OUT / (SLUG + "-paced-1p15-review-only.srt")
    output_srt.write_text(revised)
    cues = re.findall(
        r"(?m)^(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> "
        r"(\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)",
        revised.strip(), flags=re.S)
    assert len(cues) == diagnostic["cueCount"]
    pace = []
    for index, start, end, caption in cues:
        duration = seconds(end) - seconds(start)
        words = len(caption.split())
        assert duration >= 1.5
        assert words <= 7
        pace.append(round(60 * words / duration, 2))
    assert max(pace) <= 160
    assert seconds(cues[-1][2]) <= output_duration + 0.2
    # Decode all frames and samples to catch truncation and codec errors.
    subprocess.run(
        ["ffmpeg", "-v", "error", "-xerror", "-i", str(output_video),
         "-f", "null", "-"], check=True)
    report = {
        "channelId": CHANNEL, "handle": "@PrismBayAI",
        "metricoolBrandId": 6945443,
        "sourceSHA256": sha256(video),
        "reviewVideoSHA256": sha256(output_video),
        "sourceDurationSeconds": round(source_duration, 3),
        "reviewDurationSeconds": round(output_duration, 3),
        "pitchPreservingDurationFactor": FACTOR,
        "captionASRAnchorWeight": diagnostic["asrAnchorWeight"],
        "captionEstimatedMaxDisplacementSeconds":
            round(diagnostic["maximumSmoothedWordCenterDisplacementSeconds"] * FACTOR, 3),
        "captionCueCount": len(cues),
        "maximumCaptionWPM": max(pace),
        "cuesOver160WPM": sum(p > 160 for p in pace),
        "cuesUnder1p5Seconds": 0,
        "audioVisualFullDecode": "PASS",
        "paidSpendUSD": 0, "published": False,
        "publicationApproved": False, "uploadPermitted": False,
        "fullNarrationListening": "PENDING",
        "continuousMobilePlayback": "PENDING",
        "completeVoiceAndDependencyRights": "PENDING",
        "publicationStatus": "REVIEW_ONLY_NO_YOUTUBE_UPLOAD",
    }
    (OUT / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    (OUT / "REVIEW.md").write_text(
        "# PrismBay AI NIST pacing candidate, unpublished\n\n"
        "Original source and sole channel verified. The 1.15x duration stretch "
        "preserves speech pitch while keeping ASR-aligned captions below 160 WPM.\n"
        "Listen to the full narration and inspect continuous mobile playback "
        "before considering this candidate for release. Do not upload automatically.\n"
        "The source audio, script and original six diagrams are unchanged in meaning.\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
