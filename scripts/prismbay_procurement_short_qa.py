#!/usr/bin/env python3
"""Unpublished PrismBay procurement Short: machine speech, media and scene QA."""
import argparse
import difflib
import hashlib
import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageStat

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"


def probe(video):
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_format", "-show_streams",
        "-of", "json", str(video)], text=True))


def stamp(value):
    n = int(round(max(0, value) * 1000))
    h, n = divmod(n, 3600000)
    m, n = divmod(n, 60000)
    s, ms = divmod(n, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def tokens(value):
    return re.findall(r"[a-z0-9]+", value.lower())


def subtitles(words):
    cues, group = [], []
    for word in words:
        if not group:
            group = [word]
            continue
        proposed_duration = float(word["end"]) - float(group[0]["start"])
        if len(group) >= 8 or proposed_duration > 4.1:
            cues.append(group)
            group = [word]
        else:
            group.append(word)
    if group:
        cues.append(group)
    rows = []
    for i, cue in enumerate(cues):
        start = max(0, float(cue[0]["start"]) - 0.08)
        end = float(cue[-1]["end"]) + 0.12
        if i + 1 < len(cues):
            end = min(end, float(cues[i + 1][0]["start"]) - 0.02)
        end = max(end, start + 0.1)
        phrase = " ".join(w["word"].strip() for w in cue).strip()
        duration = end - start
        rows.append({"index": i + 1, "start": start, "end": end,
                     "text": phrase, "wpm": round(len(tokens(phrase)) * 60 / duration, 1)})
    lines = []
    for row in rows:
        lines += [str(row["index"]), stamp(row["start"]) + " --> " + stamp(row["end"]),
                  row["text"], ""]
    return rows, "\n".join(lines)


def frame(video, second, output):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                    "-ss", str(second), "-i", str(video), "-frames:v", "1",
                    "-vf", "scale=270:480", str(output)], check=True)


def main():
    ap = argparse.ArgumentParser()
    for name in ("video", "manifest", "spec", "output"):
        ap.add_argument("--" + name, required=True)
    args = ap.parse_args()
    video = Path(args.video)
    manifest = json.loads(Path(args.manifest).read_text())
    spec = json.loads(Path(args.spec).read_text())
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    assert manifest["channelId"] == spec["targetChannelId"] == CHANNEL
    assert manifest["published"] is False
    assert manifest["publicationApproved"] is False
    assert manifest["uploadPermitted"] is False
    assert manifest["paidSpend"] == 0
    assert spec["paidSpendUSD"] == 0
    sha = hashlib.sha256(video.read_bytes()).hexdigest()
    assert sha == manifest["sha256"], "MP4 checksum mismatch"
    media = probe(video)
    duration = float(media["format"]["duration"])
    vs = [s for s in media["streams"] if s["codec_type"] == "video"]
    aud = [s for s in media["streams"] if s["codec_type"] == "audio"]
    assert len(vs) >= 1 and len(aud) >= 1, "Missing audio or video"
    assert (vs[0]["width"], vs[0]["height"]) == (1080, 1920)
    assert 35 <= duration <= 65, f"Unexpected short duration {duration}"

    from faster_whisper import WhisperModel
    import numpy as np
    pcm = subprocess.check_output(["ffmpeg", "-hide_banner", "-loglevel", "error",
                                   "-i", str(video), "-vn", "-ac", "1", "-ar", "16000",
                                   "-f", "f32le", "-"])
    model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
    segs, _ = model.transcribe(np.frombuffer(pcm, dtype=np.float32),
                               language="en", beam_size=3,
                               word_timestamps=True, vad_filter=False)
    heard = [{"word": w.word, "start": w.start, "end": w.end}
             for seg in segs for w in (seg.words or [])]
    assert heard, "No recognizable narration"
    expected = " ".join(s["spoken"] for s in spec["segments"])
    recognized = " ".join(w["word"] for w in heard)
    similarity = difflib.SequenceMatcher(None, tokens(expected),
                                         tokens(recognized), autojunk=False).ratio()
    cues, srt = subtitles(heard)
    (out / "captions-asr-provisional.srt").write_text(srt, encoding="utf-8")
    (out / "asr-transcript.txt").write_text(recognized + "\n", encoding="utf-8")

    frames = []
    for i, second in enumerate((2, 10, 18, 26, 33, 40)):
        path = out / f"scene-{i + 1:02}.png"
        frame(video, second, path)
        with Image.open(path) as img:
            image = img.convert("RGB")
            variation = ImageStat.Stat(image).stddev
            assert max(variation) > 12, f"Low-detail scene {i + 1}"
            frames.append(image.copy())
    sheet = Image.new("RGB", (810, 960), (8, 18, 28))
    for i, img in enumerate(frames):
        sheet.paste(img, ((i % 3) * 270, (i // 3) * 480))
    sheet.save(out / "six-scene-contact-sheet.png", optimize=True)
    report = {
        "channelId": CHANNEL, "sha256": sha, "durationSeconds": round(duration, 3),
        "dimensions": [1080, 1920], "videoCodec": vs[0].get("codec_name"),
        "audioCodec": aud[0].get("codec_name"),
        "ttsEngine": manifest["ttsEngines"],
        "originalSceneCount": len(spec["segments"]),
        "sampledFrames": [2, 10, 18, 26, 33, 40],
        "captionCueCount": len(cues),
        "maxCaptionWPM": max(r["wpm"] for r in cues),
        "cuesOver160WPM": sum(r["wpm"] > 160 for r in cues),
        "cuesUnder1_5Seconds": sum(r["end"] - r["start"] < 1.5 for r in cues),
        "transcriptSequenceSimilarity": round(similarity, 4),
        "captionSource": "Faster-Whisper tiny.en provisional recognition",
        "manualNarrationReview": "NOT_PERFORMED",
        "captionSynchronization": "PROVISIONAL_ASR_ONLY",
        "mobilePlaybackReview": "NOT_PERFORMED",
        "voiceLicenseReview": "NOT_PERFORMED",
        "publicationApproved": False, "uploadPermitted": False, "paidSpendUSD": 0,
        "releaseDecision": "HOLD_PENDING_FULL_EDITORIAL_REVIEW",
        "limitations": "ASR may mishear words or numbers. Sampled frames do not replace full mobile playback. No YouTube publication."
    }
    (out / "qa-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
