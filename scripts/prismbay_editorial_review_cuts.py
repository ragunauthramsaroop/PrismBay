#!/usr/bin/env python3
"""Create unpublished, human-reviewable PrismBay AI video/audio QA cuts.

This utility never contacts YouTube, Metricool, or a publishing API.
"""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
ROOT = Path("public/youtube")
OUTPUT = Path("youtube-growth/analytics/editorial-review-cuts")
MEDIA = [
    {
        "slug": "nist-agent-identity-revocation-2026-10-29",
        "qa_dir": "youtube-growth/analytics/nist-agent-identity-qa",
        "cuts": [
            ("opening_hook", 0.0, 8.5, "First-two-second promise, source wording and opening visuals"),
            ("caption_drift", 32.5, 42.0, "Check spoken 'tried next', 'editing those records' against subtitle cues 16-19"),
        ],
    },
    {
        "slug": "ai-vendor-procurement-mobile-v2-2026-10-29",
        "qa_dir": "youtube-growth/analytics/procurement-mobile-v2-qa",
        "cuts": [
            ("quiet_interval_1", 20.5, 26.0, "Listen around 22.969-23.530 seconds; confirm intentional pause vs dropout"),
            ("quiet_interval_2", 45.0, 51.196, "Listen around 47.699-48.309 seconds; confirm CTA is audible and complete"),
        ],
    },
]


def call(*args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL)


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def duration(path):
    value = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        text=True,
    ).strip()
    return float(value)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    rows = []
    notes = [
        "# PrismBay AI | Unpublished audiovisual review cuts",
        "",
        "Only authorized channel: UCw2hs85TzIpdKwJtG-BSxzQ / @PrismBayAI.",
        "These files are for editorial review. No upload, scheduling or release approval.",
        "Each original MP4 is retained unmodified. Review the full-length audio MP3",
        "and the four targeted video excerpts, then verify continuous mobile playback.",
        "No automated check substitutes for complete narration listening.",
        "",
    ]
    for entry in MEDIA:
        slug = entry["slug"]
        video = ROOT / (slug + ".mp4")
        manifest = json.loads((ROOT / (slug + ".json")).read_text())
        assert manifest["channelId"] == CHANNEL
        assert manifest["published"] is False
        assert manifest["publicationApproved"] is False
        assert manifest["uploadPermitted"] is False
        assert manifest["paidSpend"] == 0
        actual_sha = sha256(video)
        assert actual_sha == manifest["sha256"], f"Integrity mismatch: {slug}"
        source_duration = duration(video)
        audio = OUTPUT / (slug + "-full-audio.mp3")
        call("ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
             "-i", str(video), "-vn", "-ac", "1", "-ar", "22050",
             "-c:a", "libmp3lame", "-q:a", "4", str(audio))
        assert audio.exists() and audio.stat().st_size > 1000
        notes.extend([f"## {slug}", "", f"Source length: {source_duration:.3f} seconds."])
        notes.append(f"Full narration listening file: {audio.name}.")
        qa_dir = Path(entry["qa_dir"])
        for name in ("captions-asr-anchored-script-candidate.srt",
                     "captions-asr-anchored-script-report.json"):
            src = qa_dir / name
            assert src.is_file(), f"Missing existing QA: {src}"
            shutil.copy2(src, OUTPUT / (slug + "-" + name))
        clips = []
        for label, start, end, question in entry["cuts"]:
            end = min(end, source_duration)
            assert end - start >= 1.5
            clip = OUTPUT / (slug + "-" + label + ".mp4")
            call("ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                 "-ss", f"{start:.3f}", "-i", str(video),
                 "-t", f"{end-start:.3f}",
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "25",
                 "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "112k",
                 "-movflags", "+faststart", str(clip))
            assert clip.exists() and clip.stat().st_size > 1000
            clip_duration = duration(clip)
            assert abs(clip_duration - (end-start)) < 0.4
            clips.append({"name": clip.name, "startSeconds": start,
                          "endSeconds": round(end, 3),
                          "durationSeconds": round(clip_duration, 3),
                          "sha256": sha256(clip), "reviewQuestion": question})
            notes.append(f"- {start:.3f}-{end:.3f}s, {clip.name}: {question}.")
        notes.append("")
        rows.append({
            "source": str(video), "sourceSHA256": actual_sha,
            "sourceDurationSeconds": round(source_duration, 3),
            "fullAudio": audio.name, "fullAudioSHA256": sha256(audio),
            "clips": clips, "publicationApproved": False,
            "uploadPermitted": False,
        })
    result = {
        "channelId": CHANNEL, "metricoolBrandId": 6945443,
        "status": "UNPUBLISHED_EDITORIAL_REVIEW_ONLY",
        "paidSpendUSD": 0, "publicationApproved": False,
        "uploadPermitted": False, "assets": rows,
        "fullNarrationListening": "PENDING_HUMAN_REVIEW",
        "continuousMobilePlayback": "PENDING_HUMAN_REVIEW",
        "captionSync": "PENDING_HUMAN_REVIEW",
        "completeRightsReview": "PENDING",
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(result, indent=2) + "\n")
    (OUTPUT / "REVIEW.md").write_text("\n".join(notes) + "\n")
    assert len(rows) == 2 and sum(len(x["clips"]) for x in rows) == 4
    print("Created 4 review clips, 2 full audio files, original SRTs and manifest.")
    print("Publication approval stays closed.")


if __name__ == "__main__":
    main()
