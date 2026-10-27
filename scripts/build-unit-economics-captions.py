#!/usr/bin/env python3
"""Provisional scene-aligned captions for PrismBay AI Unit Economics Short.

Text matches the approved source script. Timing inside scenes is estimated from
syllable counts, NOT human-verified speech timing. Never publish automatically.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"

def duration(path):
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)], text=True).strip())

def cuts(video):
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(video), "-vf",
         "select='gt(scene,0.09)',showinfo", "-an", "-f", "null", "-"],
        capture_output=True, text=True, check=True)
    times = [float(t) for t in re.findall(r"pts_time:([0-9.]+)", result.stderr)]
    if len(times) != 6:
        raise ValueError(f"Expected six scene transitions; found {len(times)}: {times}")
    return [0.0] + times + [duration(video)]

def syllables(text):
    return sum(max(1, len(re.findall(r"[aeiouy]+", word.lower())))
               for word in re.findall(r"[A-Za-z']+", text))

def pieces(text):
    out, current = [], []
    for word in text.split():
        proposed = " ".join(current + [word])
        if current and (len(proposed) > 38 or len(current) >= 7):
            out.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
        if current and current[-1].endswith((".", "?", "!")) and len(current) >= 3:
            out.append(" ".join(current))
            current = []
    if current:
        out.append(" ".join(current))
    if len(out) > 1 and syllables(out[-1]) < 3 and len(out[-2]) + len(out[-1]) + 1 <= 54:
        out[-2] += " " + out[-1]
        out.pop()
    return out

def timestamp(seconds):
    milliseconds = round(seconds * 1000)
    return (f"{milliseconds//3600000:02}:"
            f"{(milliseconds//60000)%60:02}:"
            f"{(milliseconds//1000)%60:02},"
            f"{milliseconds%1000:03}")

def generate(spec, video):
    if spec.get("targetChannelId") != CHANNEL or spec.get("publicationApproved") is not False or spec.get("paidSpendUSD") != 0:
        raise ValueError("Channel or release gate mismatch")
    segments = spec["segments"]
    if len(segments) != 7:
        raise ValueError("Seven original scenes required")
    boundaries = cuts(video)
    cues = []
    for i, segment in enumerate(segments):
        start, end = boundaries[i:i+2]
        text_parts = pieces(segment["spoken"])
        weights = [syllables(p) for p in text_parts]
        available = end - start - 0.18
        cursor = start + 0.05
        for part, weight in zip(text_parts, weights):
            cue_end = min(end - 0.04, cursor + available * weight / sum(weights))
            cues.append((cursor, cue_end, part))
            cursor = cue_end
    if not all(0 <= a < b <= boundaries[-1] + 0.01 for a, b, _ in cues):
        raise ValueError("Caption duration invalid")
    if not all(cues[i][0] >= cues[i-1][1] for i in range(1, len(cues))):
        raise ValueError("Caption overlap")
    if min(b-a for a,b,_ in cues) < 0.75:
        raise ValueError("Caption shorter than 0.75 seconds")
    srt = "\n\n".join(f"{i}\n{timestamp(a)} --> {timestamp(b)}\n{line}"
                       for i,(a,b,line) in enumerate(cues,1)) + "\n"
    return srt, {"cueCount":len(cues), "sceneBoundariesSeconds":boundaries,
                 "timingStatus":"PROVISIONAL_REQUIRES_FULL_AUDIO_LISTENING",
                 "publicationApproved":False, "channelId":CHANNEL}

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("spec")
    parser.add_argument("video")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    subtitles,report=generate(json.loads(Path(args.spec).read_text()),Path(args.video))
    Path(args.output).parent.mkdir(parents=True,exist_ok=True)
    Path(args.output).write_text(subtitles,encoding="utf-8")
    Path(args.output).with_suffix(".caption_qa.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report,indent=2))
