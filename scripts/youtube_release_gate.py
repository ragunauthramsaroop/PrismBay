#!/usr/bin/env python3
"""Read-only PrismBay AI media release gate. No publishing actions.

Usage: python scripts/youtube_release_gate.py --video FILE.mp4 --srt FILE.srt --manifest FILE.json --report OUT.json
Requires only Python 3, ffmpeg and ffprobe. Technical PASS is never editorial approval.
"""
import argparse
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"

def run(*args):
    p = subprocess.run(args, capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError("Command failed: " + " ".join(args) + "\n" + p.stderr[-1200:])
    return p.stdout, p.stderr

def stamp(s):
    h, m, sec = s.replace(",", ".").split(":")
    return int(h) * 3600 + int(m) * 60 + float(sec)

def read_srt(path):
    blocks = re.split(r"\n\s*\n", Path(path).read_text(encoding="utf-8-sig").replace("\r\n", "\n").strip())
    out = []
    for block in blocks:
        lines = block.strip().splitlines()
        marker = next((line for line in lines if " --> " in line), None)
        if marker is None:
            raise ValueError("Subtitle block missing timestamp")
        start, end = map(stamp, marker.split(" --> "))
        words = " ".join(lines[lines.index(marker)+1:]).strip().split()
        if not words:
            raise ValueError("Empty subtitle cue")
        out.append((start, end, len(words)))
    return out

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for part in iter(lambda: f.read(1048576), b""):
            h.update(part)
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser()
    for arg in ("video", "srt", "manifest", "report"):
        ap.add_argument("--" + arg, required=True)
    a = ap.parse_args()
    manifest = json.loads(Path(a.manifest).read_text())
    if manifest.get("channelId") != CHANNEL:
        raise SystemExit("STOP: incorrect target channel")
    probe = json.loads(run("ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", a.video)[0])
    video = next((x for x in probe["streams"] if x.get("codec_type") == "video"), {})
    audio = next((x for x in probe["streams"] if x.get("codec_type") == "audio"), {})
    duration = float(probe["format"]["duration"])
    cues = read_srt(a.srt)
    problems = []
    def check(ok, message):
        if not ok:
            problems.append(message)
    check(video.get("codec_name") == "h264", "H.264 video required")
    check(audio.get("codec_name") == "aac", "AAC audio required")
    check((video.get("width"), video.get("height")) == (1080, 1920), "1080x1920 Shorts frame required")
    check(duration > 10, "Video duration invalid")
    check(cues[0][0] <= 0.15, "Late first caption")
    check(cues[-1][1] <= duration + 0.12, "Captions exceed video")
    max_wpm = 0
    for i, (start, end, words) in enumerate(cues):
        span = end - start
        check(span >= 1.499, f"Cue {i+1} under 1.5 seconds")
        check(span > 0, f"Cue {i+1} invalid duration")
        wpm = 60 * words / span if span > 0 else 9999
        max_wpm = max(max_wpm, wpm)
        check(wpm <= 160.01, f"Cue {i+1} over 160 WPM")
        if i:
            check(start >= cues[i-1][1] - 0.02, f"Cue {i+1} overlaps")
    digest = sha256(a.video)
    known = [manifest.get(k) for k in ("captionedReviewVideoSHA256", "reviewVideoSHA256", "videoSha256", "captionedMP4SHA256")]
    known = [x for x in known if x]
    if known:
        check(digest in known, "SHA256 mismatch")
    run("ffmpeg", "-v", "error", "-i", a.video, "-map", "0:v:0", "-map", "0:a:0", "-f", "null", "-")
    _, sound = run("ffmpeg", "-hide_banner", "-i", a.video, "-vn", "-af",
                   "silencedetect=noise=-35dB:d=0.4,astats=metadata=1:reset=0", "-f", "null", "-")
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", sound)]
    ends = [(float(x), float(y)) for x,y in re.findall(r"silence_end: ([\d.]+) \| silence_duration: ([\d.]+)", sound)]
    silences = [{"start": round(starts[i],3) if i<len(starts) else None,
                 "end": round(end,3), "duration": round(span,3)} for i,(end,span) in enumerate(ends)]
    check(not any(x["duration"] > 1 for x in silences), "Audio silence exceeds one second")
    peaks = [float(x) for x in re.findall(r"Peak level dB: (-?[\d.]+)", sound)]
    peak = max(peaks) if peaks else None
    check(peak is not None and peak < -0.1, "Clipping or missing peak")
    _, frames = run("ffmpeg", "-hide_banner", "-i", a.video, "-an", "-vf",
                    "blackdetect=d=0.2:pix_th=0.10", "-f", "null", "-")
    black = re.findall(r"black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)", frames)
    check(not black, "Black video interval detected")
    result = {
        "checkedAtUTC": datetime.now(timezone.utc).isoformat(), "channelId": CHANNEL,
        "videoSHA256": digest, "durationSeconds": round(duration,3),
        "codec": video.get("codec_name"), "audioCodec": audio.get("codec_name"),
        "resolution": [video.get("width"),video.get("height")],
        "audioPeakDbFS": peak, "silenceIntervalsOver0p4s": silences,
        "blackIntervals": black, "cueCount": len(cues), "maxCaptionWPM": round(max_wpm,2),
        "minCueSeconds": round(min(e-s for s,e,_ in cues),3),
        "technicalChecksPass": not problems, "technicalIssues": problems,
        "fullNarrationListening": "NOT_VERIFIED", "spokenWordAlignment": "NOT_VERIFIED",
        "continuousMobilePlayback": "NOT_VERIFIED", "completeRights": "NOT_VERIFIED",
        "publicationApproved": False, "uploadPermitted": False, "paidSpendUSD": 0,
        "warning": "Technical QA does not authorize publication."
    }
    Path(a.report).write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    if problems:
        raise SystemExit(2)

if __name__ == "__main__":
    main()
