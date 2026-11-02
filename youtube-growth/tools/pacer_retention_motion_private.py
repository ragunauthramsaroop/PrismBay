#!/usr/bin/env python3
"""Reproducible PRIVATE P-A-C-E-R retention preview. No publishing operations.

Requirements: Python 3, cairosvg, FFmpeg/ffprobe.
Inputs: original 22 SVGs in a zip, measured timeline JSON, source private MP4.
Output: 15fps animated private MP4 and JSON QA. Never use this to auto-publish.
"""
import argparse, hashlib, json, pathlib, re, subprocess, zipfile
import cairosvg

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
FPS = 15

def run(cmd):
    subprocess.run(cmd, check=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scene-zip", type=pathlib.Path, required=True)
    ap.add_argument("--timeline-json", type=pathlib.Path, required=True)
    ap.add_argument("--source-mp4", type=pathlib.Path, required=True)
    ap.add_argument("--out-dir", type=pathlib.Path, required=True)
    args = ap.parse_args()
    t = json.loads(args.timeline_json.read_text())
    if t.get("channel_id") != CHANNEL or t.get("handle") != "@PrismBayAI":
        raise ValueError("Wrong target channel")
    if len(t["scenes"]) != 22 or t["original_narration_words"] != 1246:
        raise ValueError("Source integrity mismatch")
    o = args.out_dir
    (o / "frames").mkdir(parents=True, exist_ok=True)
    (o / "clips").mkdir(exist_ok=True)
    stats, cumulative = [], 0.0
    with zipfile.ZipFile(args.scene_zip) as z:
        for s in t["scenes"]:
            i = s["scene"]
            speech = float(s["measured_speech_s"])
            duration = speech + (1.3 if i == 22 else 0.75)
            raw = z.read(f"pacer_scene_{i:02d}.svg").decode()
            label = (f"{int(cumulative)//60:02d}:{int(cumulative)%60:02d} – "
                     f"{int(cumulative+duration)//60:02d}:{int(cumulative+duration)%60:02d}"
                     " | P-A-C-E-R · ORIGINAL EDUCATIONAL FRAMEWORK")
            raw, replaced = re.subn(
                r"\d\d:\d\d\s*–\s*\d\d:\d\d\s*\|\s*STORYBOARD FRAME\s*·\s*NOT FINAL VIDEO",
                label, raw)
            if replaced != 1:
                raise ValueError(f"Storyboard footer not found: {i}")
            png = o / "frames" / f"scene_{i:02d}.png"
            cairosvg.svg2png(bytestring=raw.encode(), write_to=str(png),
                             output_width=1920, output_height=1080)
            frames = round(duration * FPS)
            stats.append(dict(scene=i, source_start_s=s["start_s"],
                              source_end_s=s["end_s"], speech_s=speech,
                              duration_s=duration, start_s=cumulative, frames=frames))
            cumulative += duration
    # Keep every measured speech window and a nonzero pause. Audio is not sped up.
    filters = []
    for i, s in enumerate(stats):
        start, end = s["source_start_s"], s["source_start_s"] + s["duration_s"]
        if end > s["source_end_s"] + 0.001:
            raise ValueError("Audio trim exceeds source scene")
        filters.append(f"[0:a]atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS[a{i}]")
    filters.append("".join(f"[a{i}]" for i in range(22)) +
                   "concat=n=22:v=0:a=1,aresample=48000[aout]")
    audio = o / "private_audio.m4a"
    run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(args.source_mp4),
         "-filter_complex",";".join(filters),"-map","[aout]",
         "-c:a","aac","-b:a","160k",str(audio)])
    clips = []
    for s in stats:
        i, n = s["scene"], s["frames"]
        png = o / "frames" / f"scene_{i:02d}.png"
        clip = o / "clips" / f"scene_{i:02d}.mp4"
        dz = f"1+0.05*on/{max(n-1,1)}"
        x = f"(iw-iw/zoom)*{0.52 if i%2 else 0.48}"
        y = f"(ih-ih/zoom)*{0.48 if i%3 else 0.52}"
        vf = f"zoompan=z='{dz}':x='{x}':y='{y}':d={n}:s=1280x720:fps={FPS},format=yuv420p"
        run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(png),
             "-vf",vf,"-frames:v",str(n),"-an","-c:v","libx264",
             "-preset","veryfast","-crf","30","-pix_fmt","yuv420p",str(clip)])
        clips.append(clip)
    concat = o / "concat.txt"
    concat.write_text("".join(f"file '{p.resolve()}'\n" for p in clips))
    video = o / "private_video.mp4"
    run(["ffmpeg","-hide_banner","-loglevel","error","-y","-f","concat",
         "-safe","0","-i",str(concat),"-c","copy",str(video)])
    final = o / "pacer_retention_private_review.mp4"
    run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(video),
         "-i",str(audio),"-map","0:v:0","-map","1:a:0",
         "-c:v","copy","-c:a","copy","-shortest","-movflags","+faststart",str(final)])
    probe = json.loads(subprocess.check_output(
        ["ffprobe","-v","error","-show_entries","format=duration,size",
         "-of","json",str(final)]))
    if abs(float(probe["format"]["duration"]) - cumulative) > 0.25:
        raise ValueError("Duration mismatch")
    qa = dict(channel_id=CHANNEL, handle="@PrismBayAI", scenes=22,
              original_narration_words=1246, planned_duration_s=round(cumulative,3),
              measured_duration_s=float(probe["format"]["duration"]),
              sha256=hashlib.sha256(final.read_bytes()).hexdigest(),
              subtitle_word_alignment_verified=False, full_listening_verified=False,
              rights_review=False, editorial_approval=False,
              public_upload_permitted=False, paid_spend_usd=0)
    (o / "private_qa.json").write_text(json.dumps(qa,indent=2)+"\n")
    print(json.dumps(qa,indent=2))

if __name__ == "__main__":
    main()
