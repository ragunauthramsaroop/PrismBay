#!/usr/bin/env python3
"""Create private-to-Actions, review-only listening clips for Cost Controls."""
from __future__ import annotations
import argparse, csv, hashlib, json, re, subprocess
from pathlib import Path

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
SOURCE_SHA = "c8da6a5fa46bb1e7ea9dfd6abf82b55d44b80d7fc63fdf515db7362d58be6a72"
EXCEPTIONS = (2, 9, 16, 19, 33, 56, 57, 58, 59, 63, 97, 98, 99, 132, 133, 134)
SEGMENTS = (
    ("opening_cost_anomaly", (2,), 1, 4),
    ("three_controls_promise", (9,), 8, 11),
    ("six_hundred_to_twenty_four_hundred_math", (16, 19), 13, 21),
    ("cognizant_survey_scope_and_qualifier", (33,), 30, 36),
    ("alerts_controls_retries", (56, 57, 58, 59), 54, 61),
    ("paid_tool_call_wrapper", (63,), 62, 65),
    ("accepted_output_cost_math", (97, 98, 99), 94, 103),
    ("channel_promise_and_closing", (132, 133, 134), 130, 134),
)
CLOCK = re.compile(r"^(\d{2}):(\d{2}):(\d{2}),(\d{3})$")

def seconds(value):
    m = CLOCK.fullmatch(value)
    if not m:
        raise ValueError("Invalid SRT clock: " + value)
    h, minute, sec, ms = map(int, m.groups())
    if minute >= 60 or sec >= 60:
        raise ValueError("Invalid SRT time: " + value)
    return h * 3600 + minute * 60 + sec + ms / 1000

def stamp(value):
    ms = max(0, round(value * 1000))
    h, rem = divmod(ms, 3600000)
    m, rem = divmod(rem, 60000)
    s, rem = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{rem:03d}"

def digest(path):
    sha = hashlib.sha256()
    with path.open("rb") as f:
        for part in iter(lambda: f.read(1048576), b""):
            sha.update(part)
    return sha.hexdigest()

def parse_srt(path):
    cues = []
    for block in re.split(r"\n\s*\n", path.read_text(encoding="utf-8-sig").strip()):
        lines = [x.strip() for x in block.splitlines() if x.strip()]
        if len(lines) < 3 or " --> " not in lines[1]:
            raise ValueError("Malformed subtitle block")
        start, end = lines[1].split(" --> ", 1)
        cues.append(dict(cue=int(lines[0]), start=seconds(start), end=seconds(end), text=" ".join(lines[2:])))
    if len(cues) != 134 or any(c["cue"] != i for i, c in enumerate(cues, 1)):
        raise ValueError("Unexpected cue count or order")
    if abs(cues[-1]["end"] - 559.503) > .003:
        raise ValueError("Unexpected final timestamp")
    if any(c["end"] <= c["start"] for c in cues):
        raise ValueError("Invalid cue duration")
    if any(cues[i]["start"] < cues[i-1]["end"] - .001 for i in range(1, len(cues))):
        raise ValueError("Overlapping cues")
    return cues

def exceptions(cues, asr):
    with asr.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    if len(rows) != 134:
        raise ValueError("Unexpected ASR reference length")
    result = []
    for cue, row in zip(cues, rows):
        if int(row["cue"]) != cue["cue"] or row["text"].strip() != cue["text"]:
            raise ValueError(f"ASR text mismatch at cue {cue['cue']}")
        start_drift = float(row["start_drift_s"]) + cue["start"] - float(row["start_s"])
        end_drift = float(row["end_drift_s"]) + cue["end"] - float(row["end_s"])
        if max(abs(start_drift), abs(end_drift)) > 1.0:
            result.append(dict(cue=cue["cue"], startSeconds=cue["start"], endSeconds=cue["end"],
                               estimatedStartDriftSeconds=round(start_drift, 3),
                               estimatedEndDriftSeconds=round(end_drift, 3),
                               asrWordMatchFraction=round(float(row["match_fraction"]), 3),
                               text=cue["text"]))
    if tuple(x["cue"] for x in result) != EXCEPTIONS:
        raise ValueError("ASR exception set changed, review needed")
    return result

def excerpt_srt(cues, start, end, path):
    blocks = []
    for cue in cues:
        a, b = max(start, cue["start"]), min(end, cue["end"])
        if b - a < .15:
            continue
        blocks.append(f"{len(blocks)+1}\n{stamp(a-start)} --> {stamp(b-start)}\n{cue['text']}")
    path.write_text("\n\n".join(blocks) + "\n", encoding="utf-8")

def run(video, srt, asr, output):
    if digest(video) != SOURCE_SHA:
        raise ValueError("Video SHA256 mismatch. Review pack not generated.")
    cues = parse_srt(srt)
    flags = exceptions(cues, asr)
    output.mkdir(parents=True, exist_ok=True)
    clips = []
    for number, (name, flagged, first, last) in enumerate(SEGMENTS, 1):
        start = max(0.0, cues[first-1]["start"] - 1.5)
        end = min(559.503, cues[last-1]["end"] + 1.5)
        basename = f"{number:02d}_{name}"
        subs = output / (basename + ".srt")
        clip = output / (basename + ".mp4")
        excerpt_srt(cues, start, end, subs)
        vf = (f"scale=960:-2,subtitles={subs.name}:"
              "force_style='FontName=DejaVu Sans,FontSize=20,Alignment=2,MarginV=32,"
              "BorderStyle=3,BackColour=&H80000000&,PrimaryColour=&H00FFFFFF&'")
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                        "-ss", f"{start:.3f}", "-i", str(video.resolve()),
                        "-t", f"{end-start:.3f}", "-vf", vf, "-c:v", "libx264",
                        "-preset", "veryfast", "-crf", "27", "-c:a", "aac",
                        "-b:a", "96k", clip.name], cwd=output, check=True)
        if not clip.exists() or clip.stat().st_size < 5000:
            raise ValueError("Missing clip " + clip.name)
        clips.append(dict(clip=clip.name, subtitles=subs.name, reviewCueIds=list(flagged),
                          contextCueIds=[first, last], sourceStartSeconds=round(start, 3),
                          sourceEndSeconds=round(end, 3), sha256=digest(clip)))
    manifest = dict(channelId=CHANNEL, sourceVideoSha256=SOURCE_SHA, reviewOnly=True,
                    publicationApproved=False, uploadPermitted=False, paidSpendUSD=0,
                    estimatedASRExceptions=flags, clips=clips,
                    limitations="Machine-estimated drift. Clips are a listening aid, not a substitute for full narration, mobile, rights or publication review.")
    (output / "review-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    lines = ["# PrismBay AI Cost Controls | Unpublished caption listening pack", "",
             "Sole channel UCw2hs85TzIpdKwJtG-BSxzQ. No upload or scheduling authorization.", "",
             "Listen to each excerpt with burned captions and inspect the 16 flagged cues. Complete a separate uninterrupted 9m19s review.", "",
             "| Clip | Flagged cues | Original timeline seconds |", "| --- | --- | --- |"]
    for c in clips:
        lines.append(f"| {c['clip']} | {', '.join(map(str, c['reviewCueIds']))} | {c['sourceStartSeconds']:.1f} to {c['sourceEndSeconds']:.1f} |")
    lines += ["", "Machine-estimated drifts appear in review-manifest.json. Verify numerical claims, survey scope, alerts versus enforcement and closing CTA.", "",
              "Human listening, continuous playback, rights approval and native Studio authorization remain pending."]
    (output / "REVIEW-INDEX.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

def self_test():
    assert seconds("00:01:02,500") == 62.5
    assert stamp(559.503) == "00:09:19,503"
    assert sorted(x for segment in SEGMENTS for x in segment[1]) == list(EXCEPTIONS)
    for bad in ("00:61:00,000", "00:00:60,000", "invalid"):
        try:
            seconds(bad)
            raise AssertionError("Accepted invalid timestamp")
        except ValueError:
            pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--video", type=Path)
    parser.add_argument("--srt", type=Path)
    parser.add_argument("--asr", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    self_test()
    if not args.self_test:
        if any(v is None for v in (args.video, args.srt, args.asr, args.output)):
            parser.error("--video, --srt, --asr and --output required")
        run(args.video, args.srt, args.asr, args.output)
