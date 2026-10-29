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
import textwrap
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


def ass_stamp(value):
    h, m, rest = value.split(":")
    sec, millis = rest.split(",")
    return f"{int(h)}:{int(m):02d}:{int(sec):02d}.{round(int(millis)/10):02d}"


def make_ass(srt_text):
    # Explicit 1080x1920 PlayRes avoids libass scaling default 384x288
    # captions to several hundred pixels tall. Placement is below the
    # headline and above the first diagram, outside Shorts UI overlays.
    header = """[Script Info]
Title: PrismBay AI Unpublished Caption Review
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,47,&H00FFFFFF,&H00000000,&H00321D08,&H00000000,1,0,0,0,100,100,0,0,1,3,0,8,70,70,500,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    for block in srt_text.strip().split("\\n\\n"):
        lines = block.splitlines()
        start, end = lines[1].split(" --> ")
        caption = " ".join(lines[2:])
        wrapped = "\\\\N".join(textwrap.wrap(
            caption, width=29, break_long_words=False,
            break_on_hyphens=False))
        header += (f"Dialogue: 0,{ass_stamp(start)},{ass_stamp(end)},"
                   f"Default,,0,0,0,,{wrapped}\\n")
    return header


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
    ass_path = OUT / (SLUG + "-paced-1p15-review-only.ass")
    ass_path.write_text(make_ass(revised))
    captioned_video = OUT / (SLUG + "-paced-1p15-captioned-review-only.mp4")
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(output_video), "-vf", "ass=" + str(ass_path),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
        "-pix_fmt", "yuv420p", "-c:a", "copy",
        "-movflags", "+faststart", str(captioned_video),
    ], check=True)
    assert abs(probe_duration(captioned_video) - output_duration) < 0.10
    # Decode all frames and samples to catch truncation and codec errors.
    subprocess.run(
        ["ffmpeg", "-v", "error", "-xerror", "-i", str(captioned_video),
         "-f", "null", "-"], check=True)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-xerror", "-i", str(output_video),
         "-f", "null", "-"], check=True)
    report = {
        "channelId": CHANNEL, "handle": "@PrismBayAI",
        "metricoolBrandId": 6945443,
        "sourceSHA256": sha256(video),
        "reviewVideoSHA256": sha256(output_video),
        "captionedReviewVideoSHA256": sha256(captioned_video),
        "captionPlacement": "1080x1920 PlayRes, top-centered at y~500, 47px font",
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
        "audioVisualFullDecode": "PASS_BOTH_UNCAPTIONED_AND_CAPTIONED",
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
        "Captioned and uncaptioned preview videos are both included. "
        "Listen to the full narration and inspect continuous mobile playback "
        "before considering this candidate for release. Do not upload automatically.\n"
        "The source audio, script and original six diagrams are unchanged in meaning.\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
