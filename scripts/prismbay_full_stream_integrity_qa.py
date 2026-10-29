#!/usr/bin/env python3
"""Decode every frame and audio sample of an unpublished PrismBay Short.

Machine-only integrity checks. Human listening, mobile playback, caption
synchronization and rights approval remain independent publication gates.
"""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"


def run(args):
    result = subprocess.run(args, capture_output=True, text=True, check=False)
    return result.returncode, result.stdout, result.stderr


def probe(video):
    rc, stdout, stderr = run([
        "ffprobe", "-v", "error", "-show_streams", "-show_format",
        "-of", "json", str(video)
    ])
    if rc:
        raise RuntimeError("ffprobe failed: " + stderr[-1200:])
    return json.loads(stdout)


def decode(video, stream):
    rc, _, stderr = run([
        "ffmpeg", "-hide_banner", "-nostdin", "-v", "error", "-xerror",
        "-i", str(video), "-map", stream, "-f", "null", "-"
    ])
    if rc:
        raise RuntimeError("Full stream decode failed: " + stderr[-1200:])


def scan(video, filter_name, kind):
    options = ["-vf", filter_name] if kind == "video" else ["-af", filter_name]
    rc, _, stderr = run([
        "ffmpeg", "-hide_banner", "-nostdin", "-v", "info", "-i", str(video),
        "-map", "0:v:0" if kind == "video" else "0:a:0",
        *options, "-f", "null", "-"
    ])
    if rc:
        raise RuntimeError("Filter scan failed: " + stderr[-1200:])
    return stderr


def intervals(log, start, end):
    starts = [float(v) for v in re.findall(rf"{re.escape(start)}:\s*([\d.]+)", log)]
    ends = [float(v) for v in re.findall(rf"{re.escape(end)}:\s*([\d.]+)", log)]
    return [
        {"start": round(s, 3), "end": round(e, 3), "duration": round(e - s, 3)}
        for s, e in zip(starts, ends) if e >= s
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    video = Path(args.video)
    manifest = json.loads(Path(args.manifest).read_text())
    assert manifest["channelId"] == CHANNEL, "Wrong channel"
    assert manifest["paidSpend"] == 0, "Nonzero spend"
    assert all(manifest[key] is False for key in (
        "published", "publicationApproved", "uploadPermitted"
    )), "Publication gate must remain closed"
    digest = hashlib.sha256(video.read_bytes()).hexdigest()
    assert digest == manifest["sha256"], "Video SHA256 mismatch"
    data = probe(video)
    videos = [s for s in data["streams"] if s["codec_type"] == "video"]
    audios = [s for s in data["streams"] if s["codec_type"] == "audio"]
    assert len(videos) == 1 and len(audios) >= 1, "Missing or extra streams"
    assert videos[0]["codec_name"] == "h264", "Unexpected video codec"
    assert audios[0]["codec_name"] == "aac", "Unexpected audio codec"
    assert [int(videos[0]["width"]), int(videos[0]["height"])] == [1080, 1920], "Wrong dimensions"
    duration = float(data["format"]["duration"])
    assert 30 <= duration <= 180, "Unexpected Short duration"
    decode(video, "0:v:0")
    decode(video, "0:a:0")
    black_log = scan(video, "blackdetect=d=0.5:pix_th=0.08:pic_th=0.98", "video")
    silence_log = scan(video, "silencedetect=noise=-42dB:d=0.5", "audio")
    volume_log = scan(video, "volumedetect", "audio")
    black = intervals(black_log, "black_start", "black_end")
    silence = intervals(silence_log, "silence_start", "silence_end")
    max_match = re.search(r"max_volume:\s*(-?[\d.]+) dB", volume_log)
    mean_match = re.search(r"mean_volume:\s*(-?[\d.]+) dB", volume_log)
    max_db = float(max_match.group(1)) if max_match else None
    mean_db = float(mean_match.group(1)) if mean_match else None
    report = {
        "channelId": CHANNEL,
        "sourceVideoSHA256": digest,
        "durationSeconds": round(duration, 3),
        "dimensions": [1080, 1920],
        "videoCodec": videos[0]["codec_name"],
        "audioCodec": audios[0]["codec_name"],
        "allVideoFramesDecoded": True,
        "allAudioDecoded": True,
        "blackIntervalsOverHalfSecond": black,
        "silenceIntervalsOverHalfSecond": silence,
        "meanAudioVolumeDb": mean_db,
        "peakAudioVolumeDb": max_db,
        "potentialClipping": max_db is not None and max_db >= -0.1,
        "potentialBlackout": any(row["duration"] >= 1.0 for row in black),
        "limitations": "Black/silence detection can flag intentional pauses and dark designs. Full decode does not verify spoken claims, captions, mobile readability, or rights.",
        "fullNarrationListening": "NOT_PERFORMED",
        "mobilePlaybackReview": "NOT_PERFORMED",
        "voiceLicenseReview": "NOT_PERFORMED",
        "publicationApproved": False,
        "uploadPermitted": False,
        "published": False,
        "paidSpendUSD": 0,
        "releaseDecision": "HOLD_PENDING_FULL_EDITORIAL_REVIEW",
    }
    output = Path(args.report)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items()
                      if k not in ("blackIntervalsOverHalfSecond", "silenceIntervalsOverHalfSecond")}, indent=2))


if __name__ == "__main__":
    main()
