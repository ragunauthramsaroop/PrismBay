#!/usr/bin/env python3
"""Render truthful, original 9:16 product preview drafts. Never publish automatically."""
import csv
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import textwrap

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:
    raise SystemExit("Pillow required; install in CI venv") from exc

W, H = 1080, 1920
ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/global-digital-products-2026.json"
WORK = ROOT / "growth-reports/digital-prototypes"
TARGET = ROOT / "growth-reports/digital-product-videos"
BG = (12, 29, 28)
PANEL = (25, 50, 47)
MINT = (149, 231, 172)
PAPER = (237, 246, 239)
MUTED = (165, 189, 177)
BRAND = "PRISMBAY / DIGITAL LAB"
SAFE_IDS = {"cashflow-studio", "social-content-planner", "career-application-kit"}


def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    for base in ["/usr/share/fonts/truetype/dejavu/", "/usr/share/fonts/dejavu/"]:
        f = Path(base) / name
        if f.is_file():
            return ImageFont.truetype(str(f), size)
    return ImageFont.load_default()


def wrapped(draw, phrase, xy, width=28, size=40, fill=PAPER, bold=False, spacing=16):
    phrase = str(phrase)
    lines = textwrap.wrap(phrase, width=width, break_long_words=True) or [""]
    draw.multiline_text(xy, "\n".join(lines), font=font(size, bold), fill=fill, spacing=spacing)
    return len(lines) * (size + spacing)


def base(section, number):
    canvas = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(canvas)
    for y in range(0, H, 100):
        d.line((0, y, W, y), fill=(19, 44, 41), width=1)
    d.rounded_rectangle((54, 105, 1026, 1780), radius=44, fill=PANEL)
    d.text((95, 150), BRAND, font=font(30, True), fill=MINT)
    d.text((95, 202), section.upper(), font=font(22, True), fill=MUTED)
    d.line((96, 275, 980, 275), fill=(69, 99, 80), width=3)
    d.text((97, 1815), "Original product preview  /  Under development", font=font(23), fill=MUTED)
    d.rounded_rectangle((97, 1717, 980, 1732), radius=7, fill=(61, 96, 83))
    d.rounded_rectangle((97, 1717, 97 + int(883*number/4), 1732), radius=7, fill=MINT)
    return canvas, d


def make_csv_preview(d, spec, path):
    with path.open(encoding="utf-8-sig", newline="") as f:
        grid = list(csv.reader(f))
    columns = grid[0]
    # Accurate visual representation of an actual product CSV, not a screenshot of spreadsheet software.
    d.rounded_rectangle((86, 540, 993, 1430), radius=24, fill=(235, 245, 238))
    d.rounded_rectangle((86, 540, 993, 620), radius=22, fill=(193, 221, 205))
    d.text((120, 558), "ILLUSTRATIVE CSV PREVIEW", font=font(27, True), fill=(22, 61, 44))
    display_rows = grid[1:5]
    label_width = 22
    y = 670
    for col in columns[:4]:
        d.rounded_rectangle((116, y-5, 960, y+80), radius=8, fill=(215, 232, 219))
        wrapped(d, col, (133,y+11), width=label_width,size=23,fill=(14,55,40),bold=True,spacing=8)
        y += 97
    y = 1100
    d.text((120,y), "FIRST SAMPLE ROW", font=font(21,True), fill=(25,76,53))
    if display_rows:
        for value in display_rows[0][:3]:
            y += 61
            wrapped(d, str(value)[:50], (130, y),width=40,size=25,fill=(35, 60, 49))
    d.text((120,1380), "Editable worksheet inside the prototype pack", font=font(18), fill=(35,80,55))


def frame(spec, scene):
    count = scene + 1
    canvas, d = base(["The problem", "What is inside", "How to start", "Next steps"][scene], count)
    if scene == 0:
        wrapped(d, spec["hook"], (94, 440), width=19, size=66, bold=True, spacing=18)
        d.rounded_rectangle((96, 1000, 970, 1280), radius=20, fill=(35, 75, 61))
        wrapped(d, spec["problem"], (130, 1050), width=27, size=35, spacing=13)
        wrapped(d, "A practical starter is in production.", (98, 1440), width=32, size=35, fill=MINT)
    elif scene == 1:
        wrapped(d, spec["name"], (94, 365), width=24, size=55, bold=True)
        if spec["format"] == "csv":
            make_csv_preview(d, spec, WORK / spec["id"] / "templates" / (spec["id"]+".csv"))
        else:
            wrapped(d, spec["benefit"], (95, 650), width=28, size=42)
        wrapped(d, "Source file supplied as an original editable format.", (95, 1520), width=35, size=28, fill=MUTED)
    elif scene == 2:
        wrapped(d, "Three steps to make it useful", (95, 385),width=21,size=60,bold=True)
        for index, line in enumerate(spec["steps"][:3]):
            yy=700+index*235
            d.rounded_rectangle((92, yy, 985, yy+194), radius=20,fill=(35,75,61))
            d.text((122,yy+31),str(index+1).zfill(2),font=font(44,True),fill=MINT)
            wrapped(d,line,(214,yy+33),width=29,size=28)
    else:
        wrapped(d, "An original starter is being reviewed.", (95,410),width=22,size=62,bold=True)
        wrapped(d, "Not yet available for paid checkout.",(95,830),width=31,size=39,fill=MINT)
        d.rounded_rectangle((93,1090,984,1290),radius=24,fill=(40,87,62))
        wrapped(d, "Browse existing verified digital resources", (128,1143),width=31,size=37,bold=True)
        wrapped(d, "clean.prismbayai.com/digital/", (95,1440),width=39,size=28,fill=MINT)
    return canvas


def run(args):
    subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def render_one(spec):
    folder = TARGET / spec["id"]
    folder.mkdir(parents=True, exist_ok=True)
    for i in range(4):
        frame(spec, i).save(folder / ("scene-" + str(i+1) + ".png"))
    concat = folder / "sequence.ffconcat"
    lines = ["ffconcat version 1.0"]
    for i in range(1,5):
        lines.extend(["file 'scene-"+str(i)+".png'", "duration 6.0"])
    lines.append("file 'scene-4.png'")
    concat.write_text("\n".join(lines)+"\n",encoding="utf-8")
    result=folder/"preview.mp4"
    run(["ffmpeg","-hide_banner","-loglevel","error","-y","-safe","0",
         "-f","concat","-i",str(concat),"-vf","fps=30,format=yuv420p",
         "-c:v","libx264","-preset","veryfast","-crf","24",
         "-movflags","+faststart","-t","24",str(result)])
    probe=subprocess.run(["ffprobe","-v","error","-show_entries",
        "stream=codec_name,width,height:format=duration","-of","json",str(result)],
        check=True,text=True,capture_output=True)
    meta=json.loads(probe.stdout)
    video=next((s for s in meta.get("streams",[]) if s.get("codec_name")=="h264"),{})
    duration=float(meta["format"]["duration"])
    if video.get("width")!=W or video.get("height")!=H or not 23.5<=duration<=24.5:
        raise ValueError("Media failed 9:16 / 24-second QA")
    digest=hashlib.sha256(result.read_bytes()).hexdigest()
    manifest={
        "productId":spec["id"],"video":"preview.mp4","status":"review_only_not_published",
        "width":W,"height":H,"seconds":duration,"sha256":digest,
        "visuals":"Original illustrated worksheet preview using rows in the generated CSV",
        "audio":"None. No borrowed or licensed music.",
        "disclosures":["Product prototype","No live paid checkout","No performance claims"],
        "publishingAllowed":False
    }
    (folder/"media-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"product":spec["id"],"output":str(result),"sha256":digest,"duration":duration}))


def main():
    if not WORK.is_dir():
        raise SystemExit("Run node scripts/digital-product-factory.mjs first")
    specs=json.loads(CATALOG.read_text(encoding="utf-8"))["products"]
    for spec in specs:
        if spec["id"] in SAFE_IDS:
            render_one(spec)


if __name__=="__main__":
    main()
