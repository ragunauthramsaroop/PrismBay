#!/usr/bin/env python3
"""Independent second-model caption triage for one unpublished PrismBay AI video.

Never edits a video, captions, channel, or publication state. ASR is not human approval.
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
EXPECTED_SHA = "a58927dcc5cfe89dbda52b667cfd1b04e13daad05e79b8858aea188f0a8a8117"
PREVIOUS_FLAGS = {2, 9, 16, 19, 33, 56, 57, 58, 59, 63, 97, 98, 99, 132, 133, 134}
TOKEN = re.compile(r"[a-z0-9]+")


def words(text):
    return TOKEN.findall(text.lower().replace("’", "'"))


def seconds(raw):
    h, m, rest = raw.split(":")
    s, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def read_srt(path):
    cues = []
    for block in re.split(r"\n\s*\n", Path(path).read_text(encoding="utf-8-sig").strip()):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if len(lines) < 3 or " --> " not in lines[1]:
            raise ValueError("Invalid SRT block")
        start, end = [seconds(x) for x in lines[1].split(" --> ")]
        cue = {"cue": int(lines[0]), "start": start, "end": end, "text": " ".join(lines[2:])}
        if end <= start or not words(cue["text"]):
            raise ValueError("Invalid cue timing or text")
        cues.append(cue)
    if len(cues) != 134 or [c["cue"] for c in cues] != list(range(1, 135)):
        raise ValueError("Unexpected subtitle cue count or order")
    return cues


def align(cues, recognized):
    left, cue_for_token = [], []
    for cue in cues:
        for token in words(cue["text"]):
            left.append(token)
            cue_for_token.append(cue["cue"])
    right, times = [], []
    for item in recognized:
        for token in words(item["word"]):
            right.append(token)
            times.append((float(item["start"]), float(item["end"])))
    matcher = difflib.SequenceMatcher(a=left, b=right, autojunk=False)
    matches = {c["cue"]: [] for c in cues}
    for a, b, size in matcher.get_matching_blocks():
        for offset in range(size):
            matches[cue_for_token[a + offset]].append(times[b + offset])
    output = []
    for cue in cues:
        aligned = matches[cue["cue"]]
        token_count = len(words(cue["text"]))
        confidence = len(aligned) / token_count
        if aligned:
            start_drift = round(min(t[0] for t in aligned) - cue["start"], 3)
            end_drift = round(max(t[1] for t in aligned) - cue["end"], 3)
        else:
            start_drift = end_drift = None
        discrepancy = (max(abs(start_drift), abs(end_drift))
                       if start_drift is not None else None)
        if confidence < 0.5:
            decision = "LOW_WORD_MATCH_REVIEW"
        elif discrepancy is not None and discrepancy > 1:
            decision = "TIMING_REVIEW"
        else:
            decision = "SECOND_MODEL_WITHIN_ONE_SECOND"
        output.append({
            "cue": cue["cue"], "srtStart": cue["start"], "srtEnd": cue["end"],
            "matchedTokenFraction": round(confidence, 3),
            "startDriftSeconds": start_drift, "endDriftSeconds": end_drift,
            "maxAbsDriftSeconds": discrepancy,
            "previousTinyModelFlag": cue["cue"] in PREVIOUS_FLAGS,
            "secondModelDecision": decision,
            "captionText": cue["text"],
        })
    return output


def self_test():
    fake = [{"cue": 1, "start": 0, "end": 2, "text": "Budget limits work"}]
    result = align(fake, [
        {"word": "Budget", "start": 0.1, "end": 0.5},
        {"word": "limits", "start": 0.6, "end": 1.0},
        {"word": "work", "start": 1.1, "end": 1.7},
    ])
    assert result[0]["secondModelDecision"] == "SECOND_MODEL_WITHIN_ONE_SECOND"
    assert result[0]["matchedTokenFraction"] == 1
    assert words("Twenty-four dollars.") == ["twenty", "four", "dollars"]
    assert seconds("00:02:18,500") == 138.5
    print("Independent caption triage self-test PASS")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--video")
    p.add_argument("--srt")
    p.add_argument("--output")
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        self_test()
        return
    if not (args.video and args.srt and args.output):
        p.error("--video, --srt and --output are required")
    h = hashlib.sha256()
    with open(args.video, "rb") as handle:
        for block in iter(lambda: handle.read(1048576), b""):
            h.update(block)
    if h.hexdigest() != EXPECTED_SHA:
        raise SystemExit("Video SHA mismatch: refusing wrong source")
    cues = read_srt(args.srt)
    with tempfile.TemporaryDirectory() as tmp:
        wav = str(Path(tmp) / "speech.wav")
        subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
                        "-y", "-i", args.video, "-vn", "-ac", "1", "-ar", "16000",
                        wav], check=True)
        # Pass decoded PCM directly. PyAV decoder versions differ on metadata_errors.
        import wave
        import numpy as np
        from faster_whisper import WhisperModel
        with wave.open(wav, "rb") as audio_file:
            if (audio_file.getframerate(), audio_file.getnchannels(), audio_file.getsampwidth()) != (16000, 1, 2):
                raise SystemExit("Unexpected audio format")
            pcm = np.frombuffer(audio_file.readframes(audio_file.getnframes()),
                                dtype=np.int16).astype(np.float32) / 32768.0
        model = WhisperModel("base.en", device="cpu", compute_type="int8", cpu_threads=4)
        segments, info = model.transcribe(pcm, beam_size=3, word_timestamps=True,
                                          vad_filter=False, language="en")
        recognized = []
        for segment in segments:
            for word in segment.words or []:
                if word.start is not None and word.end is not None:
                    recognized.append({"word": word.word, "start": word.start,
                                       "end": word.end})
    if len(recognized) < 300:
        raise SystemExit("ASR returned too few words for reliable triage")
    results = align(cues, recognized)
    pending = [r for r in results if r["secondModelDecision"] != "SECOND_MODEL_WITHIN_ONE_SECOND"]
    old = [r for r in results if r["previousTinyModelFlag"]]
    resolved_proxy = [r["cue"] for r in old if r["secondModelDecision"] == "SECOND_MODEL_WITHIN_ONE_SECOND"]
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    payload = {
        "channelId": CHANNEL, "videoSha256": EXPECTED_SHA,
        "model": "faster-whisper base.en CPU int8, independent of prior tiny.en",
        "asrWords": len(recognized), "captionCues": len(cues),
        "previousTinyModelFlags": sorted(PREVIOUS_FLAGS),
        "previousFlagsNotRepeatedByBaseProxy": resolved_proxy,
        "baseModelReviewCueCount": len(pending),
        "publicationApproved": False, "uploadPermitted": False, "paidSpendUSD": 0,
        "caveat": "ASR timing and text are fallible. No human listening or rights review.",
        "cues": results,
    }
    (output / "dual-asr-review.json").write_text(json.dumps(payload, indent=2) + "\n")
    rows = [
        "# PrismBay AI Cost Controls | Second-model speech alignment triage",
        "",
        "Target: " + CHANNEL + " / @PrismBayAI. Review only. No upload.",
        "",
        "Independent base.en ASR word timestamps compared with the 134-cue corrected SRT.",
        "Prior comparison used tiny.en. Both estimates are fallible and are not listening approval.",
        "",
        "Base-model review cues: " + str(len(pending)) + " of 134.",
        "Earlier tiny-model flags not repeated by base-model proxy: " +
        (", ".join(map(str, resolved_proxy)) or "none") + ".",
        "",
        "| Cue | Prior flag | Matched words | Start drift | End drift | Second-model decision |",
        "| --- | --- | ---: | ---: | ---: | --- |",
    ]
    for r in sorted(results, key=lambda x: (x["secondModelDecision"] == "SECOND_MODEL_WITHIN_ONE_SECOND",
                                            -(x["maxAbsDriftSeconds"] or 0))):
        if r["secondModelDecision"] == "SECOND_MODEL_WITHIN_ONE_SECOND" and not r["previousTinyModelFlag"]:
            continue
        rows.append("| {cue} | {previousTinyModelFlag} | {matchedTokenFraction:.0%} | {startDriftSeconds} | {endDriftSeconds} | {secondModelDecision} |".format(**r))
    rows += ["", "This report prioritizes listening. It does not approve speech, captions, mobile playback, licenses or publication.",
             "publicationApproved=false; uploadPermitted=false; paidSpendUSD=0."]
    (output / "dual-asr-review.md").write_text("\n".join(rows) + "\n")
    print(json.dumps({k: payload[k] for k in
          ("asrWords", "captionCues", "baseModelReviewCueCount",
           "previousFlagsNotRepeatedByBaseProxy", "publicationApproved")}, indent=2))


if __name__ == "__main__":
    main()
