#!/usr/bin/env python3
"""Private zero-cost narration measurement. No publication path."""
import argparse
import hashlib
import json
import re
from pathlib import Path

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
SOURCE = Path("youtube-growth/production/2026-11-02-pacer-sentence-aligned-voiceover-cues.json")

def checksum(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def validate(data):
    assert data["channel_id"] == CHANNEL and data["handle"] == "@PrismBayAI"
    assert str(data["metricool_brand_id"]) == "6945443"
    assert data["paid_spend_usd"] == 0
    assert data["release_gates"]["public_upload_permitted"] is False
    assert data["release_gates"]["measured_audio_sync"] is False
    assert len(data["scenes"]) == 22 and data["total_narration_words"] == 1246
    end = 0
    words = 0
    for index, scene in enumerate(data["scenes"], 1):
        assert scene["scene"] == index and scene["start_s"] == end
        assert scene["end_s"] > end
        assert scene["duration_s"] == scene["end_s"] - end
        assert len(scene["original_text"].split()) == scene["word_count"]
        end = scene["end_s"]
        words += scene["word_count"]
    assert end == 570 and words == 1246
    return {"channel_id": CHANNEL, "scenes": 22, "words": words,
            "duration_s": 570, "publication_permitted": False, "paid_spend_usd": 0}

def render(data, args):
    import numpy as np
    import soundfile as sf
    from kokoro_onnx import Kokoro

    args.out.mkdir(parents=True, exist_ok=True)
    tts = Kokoro(str(args.model), str(args.voices))
    report = {"schema": "prismbay-private-measured-kokoro-narration-v1",
              **validate(data), "status": "PRIVATE_AUDIO_REVIEW_NOT_APPROVED",
              "voice": args.voice, "speed": args.speed,
              "source_sha256": checksum(SOURCE),
              "model_sha256": checksum(args.model),
              "voices_sha256": checksum(args.voices),
              "captions_synchronized": False,
              "full_narration_listening": False,
              "rights_and_editorial_approval": False, "scene_measurements": []}
    sample_rate = None
    segments = []
    all_fit = True
    for scene in data["scenes"]:
        clips = []
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", scene["original_text"]) if s.strip()]
        for sentence in sentences:
            audio, sr = tts.create(sentence, voice=args.voice, speed=args.speed, lang="en-us")
            audio = np.asarray(audio, dtype=np.float32).reshape(-1)
            if len(audio) == 0:
                raise RuntimeError(f"Empty TTS audio in scene {scene['scene']}")
            if sample_rate is None:
                sample_rate = sr
            if sr != sample_rate:
                raise RuntimeError("Unexpected sample-rate change")
            clips.extend([audio, np.zeros(round(sr * 0.14), dtype=np.float32)])
        raw = np.concatenate(clips[:-1])
        target = scene["duration_s"]
        measured = len(raw) / sample_rate
        over = measured > target
        remaining = max(0.0, target - measured)
        all_fit = all_fit and not over
        path = args.out / f"pacer_scene_{scene['scene']:02d}_private.wav"
        sf.write(path, raw, sample_rate, subtype="PCM_16")
        report["scene_measurements"].append({
            "scene": scene["scene"], "slot_s": target,
            "measured_speech_s": round(measured, 3),
            "overrun_s": round(max(0, measured - target), 3),
            "potential_trailing_silence_s": round(remaining, 3),
            "needs_editorial_retiming": over or remaining > 2.5,
            "sha256": checksum(path)})
        if not over:
            segments.append(np.pad(raw, (0, round(target * sample_rate) - len(raw))))
        print(f"scene {scene['scene']:02d}: {measured:.2f}s / {target}s, overrun={over}", flush=True)
    report["all_scenes_fit"] = all_fit
    report["scenes_needing_review"] = sum(s["needs_editorial_retiming"] for s in report["scene_measurements"])
    if all_fit:
        joined = np.concatenate(segments)
        assert abs(len(joined) / sample_rate - 570) < 0.001
        path = args.out / "pacer_570s_private_narration_preview.wav"
        sf.write(path, joined, sample_rate, subtype="PCM_16")
        report["preview_sha256"] = checksum(path)
        report["preview_duration_s"] = len(joined) / sample_rate
    else:
        report["preview_status"] = "WITHHELD: SCENE OVERRUNS REQUIRE RETIMING"
    (args.out / "pacer_narration_measurement.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"all_scenes_fit": all_fit, "scenes_needing_review": report["scenes_needing_review"],
                      "public_upload_permitted": False}))

def main():
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--render", action="store_true")
    ap.add_argument("--model", type=Path)
    ap.add_argument("--voices", type=Path)
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=0.90)
    ap.add_argument("--out", type=Path, default=Path("pacer-private-audio-review"))
    args = ap.parse_args()
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    print(json.dumps(validate(data)))
    if args.check:
        return
    if not args.model or not args.voices or not args.model.is_file() or not args.voices.is_file():
        ap.error("--render requires local --model and --voices")
    if not 0.75 <= args.speed <= 1.2:
        ap.error("speed outside editorial range")
    render(data, args)

if __name__ == "__main__":
    main()
