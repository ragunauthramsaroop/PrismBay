#!/usr/bin/env python3
"""Original long-form PrismBay AI explainer renderer. Zero paid services. No publishing."""
from __future__ import annotations
import hashlib
import json
import re
import subprocess
import sys
import textwrap
import wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "editorial/youtube/PB-AGENT-ACCESS-001_package.md"
OUT = ROOT / "public/youtube/longform/PB-AGENT-ACCESS-001"
WORK = ROOT / ".longform-build/PB-AGENT-ACCESS-001"
VOICE = "en_US-norman-medium"
CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
W, H = 1920, 1080
INK, WHITE, CYAN, GREEN, AMBER, RED = (10, 20, 36), (244, 249, 255), (68, 218, 231), (142, 236, 173), (255, 190, 101), (246, 104, 109)

def call(args):
    print("RUN", " ".join(map(str, args[:8])), flush=True)
    subprocess.run(args, check=True)

def ft(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/" + name, size)

def lines(text, width, max_lines):
    words = textwrap.wrap(re.sub(r"\s+", " ", text), width=width)
    if len(words) > max_lines:
        words = words[:max_lines]
        words[-1] = words[-1].rstrip(" .") + "..."
    return "\n".join(words)

def parse_script():
    raw = SOURCE.read_text(encoding="utf-8")
    raw = raw.split("## Finished narration script", 1)[1].split("## Long-form title candidates", 1)[0]
    chapters = []
    for chunk in re.split(r"(?m)^###\s+", raw)[1:]:
        head, _, body = chunk.partition("\n")
        title = head.split("|", 1)[-1].strip()
        paragraphs = []
        for p in re.split(r"\n\s*\n", body):
            p = re.sub(r"\s+", " ", p.strip())
            if not p or p.lower().startswith("on screen:"):
                continue
            paragraphs.append(p)
        if paragraphs:
            chapters.append((title, paragraphs))
    assert len(chapters) == 8, "Unexpected editorial chapter count"
    assert sum(len(p.split()) for _, ps in chapters for p in ps) >= 1000, "Incomplete narration source"
    return chapters

def box(d, xy, label, color, size=32, fill=(22, 39, 57)):
    d.rounded_rectangle(xy, radius=19, fill=fill, outline=color, width=4)
    x1, y1, x2, y2 = xy
    f = ft(size, True)
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    d.text((x1+(x2-x1-tw)/2, y1+(y2-y1-th)/2-5), label, font=f, fill=WHITE)

def diagram(d, chapter, slide):
    x1, x2 = 1150, 1810
    d.rounded_rectangle((x1, 255, x2, 892), radius=36, fill=(19, 37, 57), outline=(54, 82, 108), width=3)
    d.text((1190, 293), "WORKFLOW MODEL", font=ft(27, True), fill=CYAN)
    if chapter == 0:
        box(d, (1210, 405, 1740, 515), "READ INVOICE", CYAN, 42)
        box(d, (1210, 565, 1740, 675), "CHECK BANK DETAILS", AMBER, 32)
        box(d, (1210, 725, 1740, 835), "PAYMENT: BLOCKED", RED, 37)
    elif chapter == 1:
        labels = ["OBSERVE", "DRAFT", "PROPOSE", "EXECUTE"]
        for j, lab in enumerate(labels):
            box(d, (1210, 383+j*113, 1740, 475+j*113), lab, [CYAN, GREEN, AMBER, RED][j], 38, (23+j*5, 41+j*3, 60))
            if j == slide % 4:
                d.ellipse((1177, 417+j*113, 1197, 437+j*113), fill=WHITE)
    elif chapter == 2:
        for j, lab in enumerate(["READ", "DRAFT", "SEND", "PAY", "DELETE"]):
            box(d, (1210, 377+j*94, 1740, 456+j*94), lab, GREEN if j < 2 else RED, 33)
    elif chapter == 3:
        d.text((1240, 410), "5 HANDOFFS", font=ft(49, True), fill=AMBER)
        d.line((1290, 523, 1690, 523), fill=WHITE, width=8)
        d.polygon([(1670, 503), (1720, 523), (1670, 543)], fill=WHITE)
        d.text((1240, 600), "3 HANDOFFS", font=ft(49, True), fill=GREEN)
        d.text((1230, 760), "ILLUSTRATIVE", font=ft(29, True), fill=WHITE)
    elif chapter == 4:
        for j, lab in enumerate(["PROPOSE", "APPROVE", "POLICY CHECK", "EXECUTE", "AUDIT LOG"]):
            box(d, (1210, 370+j*98, 1740, 450+j*98), lab, RED if j == 2 else CYAN, 32)
    elif chapter == 5:
        d.text((1225, 414), "800 x 3 MIN", font=ft(43, True), fill=CYAN)
        d.text((1225, 495), "= 40 HOURS", font=ft(51, True), fill=WHITE)
        d.line((1220, 595, 1750, 595), fill=AMBER, width=3)
        d.text((1225, 655), "$500 - $400", font=ft(43, True), fill=GREEN)
        d.text((1225, 740), "= $100 / MONTH", font=ft(42, True), fill=WHITE)
    elif chapter == 6:
        for j, lab in enumerate(["UNTRUSTED INPUT", "BANK CHANGE", "STALE APPROVAL", "TOOL FAILURE", "DENIED ACTION"]):
            box(d, (1210, 371+j*99, 1740, 452+j*99), lab, RED if j == slide % 5 else AMBER, 28)
    else:
        for j, lab in enumerate(["OBSERVE  :  READ", "DRAFT  :  STAGE", "PROPOSE  :  APPROVE", "EXECUTE  :  LIMIT"]):
            box(d, (1210, 395+j*112, 1740, 485+j*112), lab, [CYAN, GREEN, AMBER, RED][j], 28)

def render_slide(chapter_index, chapter_title, slide_index, total, narration, path):
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, 17), fill=CYAN)
    d.rectangle((0, 0, 28, H), fill=(26, 68, 79))
    for i in range(0, W, 90):
        d.line((i, 0, i, H), fill=(17, 31, 47), width=1)
    d.text((93, 64), "PRISMBAY AI", font=ft(42, True), fill=CYAN)
    d.text((96, 130), "AI SYSTEMS UNDER CONTROL  /  EXECUTIVE FIELD GUIDE", font=ft(25, True), fill=(175, 197, 217))
    d.line((96, 197, 1810, 197), fill=(71, 100, 126), width=2)
    d.text((96, 266), lines(chapter_title.upper(), 24, 3), font=ft(56, True), fill=WHITE, spacing=16)
    teaser = re.split(r"(?<=[.!?])\s+(?=[A-Z])", narration)
    summary = " ".join(teaser[:2])
    d.multiline_text((100, 560), lines(summary, 39, 5), font=ft(35), fill=(207, 221, 236), spacing=17)
    diagram(d, chapter_index, slide_index)
    d.line((100, 950, 1810, 950), fill=(60, 83, 105), width=2)
    d.text((100, 982), "ORIGINAL PRISMBAY FRAMEWORK  |  EXAMPLES ARE HYPOTHETICAL", font=ft(22, True), fill=(165, 186, 206))
    d.text((1610, 982), f"{slide_index+1:02d} / {total:02d}", font=ft(24, True), fill=CYAN)
    img.save(path, optimize=True)

def wav_seconds(path):
    with wave.open(str(path), "rb") as w:
        return w.getnframes()/w.getframerate()

def stamp(seconds):
    n = int(seconds*1000)
    hh, n = divmod(n, 3600000)
    mm, n = divmod(n, 60000)
    ss, ms = divmod(n, 1000)
    return f"{hh:02d}:{mm:02d}:{ss:02d},{ms:03d}"

def thumbnail(label, concept, filename):
    bg = [(11, 23, 40), (244, 248, 252), (19, 33, 48)][concept]
    fg = WHITE if concept != 1 else INK
    img = Image.new("RGB", (1280, 720), bg)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 1280, 24), fill=[CYAN, RED, AMBER][concept])
    d.text((70, 70), "PRISMBAY AI", font=ft(32, True), fill=[CYAN, RED, AMBER][concept])
    d.multiline_text((70, 210), lines(label, 14, 3), font=ft(82, True), fill=fg, spacing=20)
    if concept == 0:
        for j, s in enumerate(["OBSERVE", "DRAFT", "PROPOSE", "EXECUTE"]):
            box(d, (805, 160+j*125, 1190, 260+j*125), s, [CYAN, GREEN, AMBER, RED][j], 32)
    elif concept == 1:
        d.rounded_rectangle((835, 215, 1175, 520), radius=40, fill=RED)
        d.text((878, 316), "STOP", font=ft(78, True), fill=WHITE)
    else:
        for j, s in enumerate(["READ", "SEND", "PAY", "DELETE"]):
            box(d, (820, 158+j*124, 1190, 255+j*124), s, RED if j > 1 else CYAN, 31)
    img.save(filename, optimize=True)

def main():
    chapters = parse_script()
    OUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    voice_dir = WORK/"voices"
    voice_dir.mkdir(exist_ok=True)
    call([sys.executable, "-m", "piper.download_voices", "--data-dir", str(voice_dir), VOICE])
    slides = [(ci, title, paragraph) for ci, (title, paragraphs) in enumerate(chapters) for paragraph in paragraphs]
    assert 18 <= len(slides) <= 45, "Unexpected slide count"
    chunks = []
    subs = []
    chapters_times = []
    cursor = 0.0
    for i, (ci, title, spoken) in enumerate(slides):
        if not chapters_times or chapters_times[-1]["index"] != ci:
            chapters_times.append({"index":ci,"startSeconds":round(cursor,2),"title":title})
        wav = WORK/f"voice-{i:02d}.wav"
        png = WORK/f"slide-{i:02d}.png"
        mp4 = WORK/f"scene-{i:02d}.mp4"
        call([sys.executable, "-m", "piper", "-m", VOICE, "--data-dir", str(voice_dir), "-f", str(wav), "--", spoken])
        duration = wav_seconds(wav)+0.28
        render_slide(ci, title, i, len(slides), spoken, png)
        fade_out = max(0.1, duration-0.24)
        call(["ffmpeg","-hide_banner","-loglevel","error","-y","-loop","1","-framerate","24","-i",str(png),"-i",str(wav),"-t",f"{duration:.3f}","-vf",f"fade=t=in:st=0:d=0.18,fade=t=out:st={fade_out:.3f}:d=0.18,format=yuv420p","-c:v","libx264","-preset","veryfast","-crf","29","-r","24","-c:a","aac","-b:a","112k","-af","apad=pad_dur=0.28,volume=-3dB","-movflags","+faststart",str(mp4)])
        chunks.append(mp4)
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", spoken) if s.strip()]
        count = sum(len(s.split()) for s in sentences)
        t = cursor
        for s in sentences:
            seconds = duration*len(s.split())/max(1,count)
            subs.append((t,t+seconds,s))
            t += seconds
        cursor += duration
    playlist = WORK/"concat.txt"
    playlist.write_text("".join("file '"+str(p.resolve())+"'\n" for p in chunks))
    target = OUT/"PB-AGENT-ACCESS-001.mp4"
    call(["ffmpeg","-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",str(playlist),"-c","copy","-movflags","+faststart",str(target)])
    probe = json.loads(subprocess.check_output(["ffprobe","-v","error","-show_format","-show_streams","-of","json",str(target)],text=True))
    streams = probe["streams"]
    v = next(s for s in streams if s["codec_type"]=="video")
    a = next(s for s in streams if s["codec_type"]=="audio")
    duration = float(probe["format"]["duration"])
    assert v["width"]==W and v["height"]==H and v["codec_name"]=="h264" and a["codec_name"]=="aac"
    assert 420 <= duration <= 900, f"Duration {duration} outside editorial target; review script and voice speed"
    (OUT/"PB-AGENT-ACCESS-001.srt").write_text("".join(f"{i}\n{stamp(s)} --> {stamp(e)}\n{txt}\n\n" for i,(s,e,txt) in enumerate(subs,1)),encoding="utf-8")
    for i, label in enumerate(["WHO APPROVES?", "PAYMENT BLOCKED", "10 BUSINESS ACTIONS"]):
        thumbnail(label,i,OUT/f"thumbnail_{'ABC'[i]}.png")
    meta = {
        "channelId": CHANNEL, "handle":"@PrismBayAI", "source":str(SOURCE.relative_to(ROOT)),
        "titleCandidates":["AI Agents Need Permissions, Not Prompts | The 4-Level Business Framework","Would You Let an AI Agent Approve a Payment? Build This Control First","Before You Deploy AI Agents, Map These 10 Business Actions"],
        "durationSeconds":round(duration,2), "chapters":chapters_times, "slides":len(slides),
        "videoSha256":hashlib.sha256(target.read_bytes()).hexdigest(),
        "voice":"Piper en_US-norman-medium", "voiceModelCard":"https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/norman/medium/MODEL_CARD",
        "voiceDatasetLicense":"LibriVox public domain per upstream model card",
        "originalGraphics":True,"thirdPartyClips":False,"paidSpendUSD":0,
        "manualVisualReview":"PENDING","manualNarrationReview":"PENDING","publicationApproved":False,
        "published":False,"youtubeVideoId":None,"requiresNativeABTestAfterPublish":True
    }
    (OUT/"manifest.json").write_text(json.dumps(meta,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"duration":duration,"sizeBytes":target.stat().st_size,"slides":len(slides),"publicationApproved":False},indent=2))
if __name__=="__main__":
    main()
