#!/usr/bin/env python3
"""Generate an original-script caption candidate anchored to ASR word timestamps.

This is automated QA, not human listening approval or YouTube publication.
"""
import argparse
import difflib
import json
import re
import subprocess
from pathlib import Path

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"


def norm(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


def stamp(seconds):
    n = round(max(0, seconds) * 1000)
    hours, n = divmod(n, 3600000)
    minutes, n = divmod(n, 60000)
    secs, millis = divmod(n, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def align_centers(expected, recognized, duration):
    """Map exact scripted words to recognized word centers; interpolate gaps."""
    lhs = [norm(word) for word in expected]
    rhs = [norm(word["word"]) for word in recognized]
    matches = difflib.SequenceMatcher(None, lhs, rhs, autojunk=False)
    anchors = {}
    for block in matches.get_matching_blocks():
        for offset in range(block.size):
            i, j = block.a + offset, block.b + offset
            anchors[i] = (float(recognized[j]["start"]) + float(recognized[j]["end"])) / 2
    match_ratio = len(anchors) / max(1, len(expected))
    if match_ratio < 0.78:
        raise ValueError(f"Insufficient word alignment confidence: {match_ratio:.3f}")
    points = [None] * len(expected)
    for index, center in anchors.items():
        points[index] = center
    known = [(-1, 0.0)] + sorted(anchors.items()) + [(len(expected), duration)]
    for (left_i, left_t), (right_i, right_t) in zip(known, known[1:]):
        if right_t < left_t - 0.3:
            raise ValueError("Non-monotonic ASR word anchors")
        for index in range(left_i + 1, right_i):
            fraction = (index - left_i) / (right_i - left_i)
            points[index] = left_t + (right_t - left_t) * fraction
    for i, center in enumerate(points):
        points[i] = min(duration - 0.005, max(0.005, float(center)))
        if i and points[i] <= points[i - 1]:
            points[i] = points[i - 1] + 0.002
    if points[-1] >= duration:
        raise ValueError("ASR word timestamps exceed media duration")
    return points, match_ratio


def segment(expected, centers, duration):
    """Limit every caption to seven words, smoothing ASR jitter when needed."""
    n = len(expected)
    for anchor_weight in (1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4):
        smoothed = [
            anchor_weight * centers[i]
            + (1 - anchor_weight) * (i + 0.5) * duration / n
            for i in range(n)
        ]
        boundaries = [0.0] + [
            (smoothed[i - 1] + smoothed[i]) / 2 for i in range(1, n)
        ] + [duration]
        best = [float("inf")] * (n + 1)
        previous = [-1] * (n + 1)
        best[0] = 0.0
        for i in range(n):
            if best[i] == float("inf"):
                continue
            for j in range(i + 2, min(n, i + 7) + 1):
                seconds = boundaries[j] - boundaries[i]
                words = j - i
                wpm = 60 * words / max(0.001, seconds)
                if seconds < 1.5 or seconds > 4.5 or wpm > 160:
                    continue
                penalty = abs(words - 5) * 0.35 + abs(seconds - 2.4) * 0.25
                if expected[j - 1].endswith((".", "!", "?")):
                    penalty -= 0.25
                if best[i] + penalty < best[j]:
                    best[j], previous[j] = best[i] + penalty, i
        if previous[n] >= 0:
            groups = []
            j = n
            while j:
                i = previous[j]
                groups.append((i, j))
                j = i
            groups.reverse()
            rows = []
            for index, (i, j) in enumerate(groups, 1):
                start, end = boundaries[i], boundaries[j]
                rows.append({
                    "index": index, "start": round(start, 3),
                    "end": round(end, 3), "text": " ".join(expected[i:j]),
                    "words": j - i,
                    "wpm": round((j - i) * 60 / (end - start), 2),
                })
            max_drift = max(abs(smoothed[i] - centers[i]) for i in range(n))
            return rows, anchor_weight, max_drift
    raise ValueError(
        "No readable seven-word caption segmentation found. Retain release hold."
    )


def make_srt(rows):
    blocks = []
    for row in rows:
        blocks.append(f"{row['index']}\n{stamp(row['start'])} --> {stamp(row['end'])}\n{row['text']}\n")
    return "\n".join(blocks) + "\n"


def main():
    ap = argparse.ArgumentParser()
    for field in ("video", "manifest", "spec", "output"):
        ap.add_argument("--" + field, required=True)
    args = ap.parse_args()
    video = Path(args.video)
    manifest = json.loads(Path(args.manifest).read_text())
    spec = json.loads(Path(args.spec).read_text())
    assert manifest["channelId"] == spec["targetChannelId"] == CHANNEL
    assert manifest["published"] is False
    assert manifest["publicationApproved"] is False
    assert manifest["uploadPermitted"] is False
    assert manifest["paidSpend"] == 0 and spec["paidSpendUSD"] == 0
    assert float(manifest.get("pacedFactor", 0)) >= 1.20, "Require revised 50-second narration"
    import hashlib
    sha = hashlib.sha256(video.read_bytes()).hexdigest()
    assert sha == manifest["sha256"], "Source video integrity failure"
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_format", "-of", "json", str(video)], text=True))
    duration = float(probe["format"]["duration"])
    from faster_whisper import WhisperModel
    import numpy as np
    pcm = subprocess.check_output([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(video),
        "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"])
    model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(np.frombuffer(pcm, dtype=np.float32),
                                   language="en", beam_size=3,
                                   word_timestamps=True, vad_filter=False)
    recognized = [{"word": word.word, "start": word.start, "end": word.end}
                  for segment in segments for word in (segment.words or [])]
    expected = " ".join(segment["spoken"] for segment in spec["segments"]).split()
    assert recognized, "No recognized speech"
    centers, ratio = align_centers(expected, recognized, duration)
    rows, anchor_weight, max_drift = segment(expected, centers, duration)
    assert " ".join(row["text"] for row in rows) == " ".join(expected)
    assert all(row["end"] - row["start"] >= 1.49 for row in rows)
    assert all(row["wpm"] <= 160 and row["words"] <= 7 for row in rows)
    assert all(rows[i]["end"] <= rows[i + 1]["start"] for i in range(len(rows) - 1))
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    (out / "captions-asr-anchored-script-candidate.srt").write_text(make_srt(rows))
    report = {
        "channelId": CHANNEL, "sourceVideoSHA256": sha,
        "durationSeconds": round(duration, 3),
        "exactScriptWords": len(expected), "recognizedASRWords": len(recognized),
        "directASRWordMatchRatio": round(ratio, 4),
        "cueCount": len(rows), "maximumWPM": max(row["wpm"] for row in rows),
        "maximumWordsPerCue": max(row["words"] for row in rows),
        "asrAnchorWeight": anchor_weight,
        "maximumSmoothedWordCenterDisplacementSeconds": round(max_drift, 3),
        "cuesOver160WPM": sum(row["wpm"] > 160 for row in rows),
        "cuesUnder1_5Seconds": sum(row["end"] - row["start"] < 1.5 for row in rows),
        "captionTiming": "ASR_WORD_ANCHORED_INTERPOLATED_CANDIDATE_NOT_HUMAN_VERIFIED",
        "fullNarrationListening": "NOT_PERFORMED",
        "mobilePlaybackReview": "NOT_PERFORMED",
        "voiceLicenseReview": "NOT_PERFORMED",
        "publicationApproved": False, "uploadPermitted": False,
        "published": False, "paidSpendUSD": 0,
        "releaseDecision": "HOLD_PENDING_FULL_EDITORIAL_REVIEW",
        "cues": rows,
    }
    (out / "captions-asr-anchored-script-report.json").write_text(
        json.dumps(report, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "cues"}, indent=2))


if __name__ == "__main__":
    main()
