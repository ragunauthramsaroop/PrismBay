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

def concise_summary(chapter_index, narration):
    """Use a complete, legible sentence rather than clipped narration."""
    first = re.split(r"(?<=[.!?])\s+(?=[A-Z])", narration.strip(), maxsplit=1)[0].strip()
    if len(first) <= 145:
        return first
    fallbacks = {
        0: "An AI assistant should summarize invoices, not authorize payments.",
        1: "Four permission levels define what an AI agent is allowed to do.",
        2: "Inventory each business action before assigning tool permissions.",
        3: "Start with low-risk supplier workflows and independent review.",
        4: "Approvals require identity, transaction scope and audit evidence.",
        5: "Measure released capacity, verified cash effects and exceptions.",
        6: "Test hostile inputs, bank changes, stale approvals, errors and denials.",
        7: "Expand execution only after technical controls and recovery tests."
    }
    return fallbacks[chapter_index]


def render_executive_scene(chapter_index, chapter_title, slide_index, total, narration, path, mode):
    """Three diagram-first, compositionally distinct original visual scenes.

    These scenes are intentionally different from the conventional title/diagram
    slides: a light action ledger, a dark 2x2 permission map, and a five-step
    evidence flow. Every slide is original and tied to its chapter.
    """
    summary = concise_summary(chapter_index, narration)
    if mode == 2:
        img = Image.new("RGB", (W, H), (238, 245, 249))
        d = ImageDraw.Draw(img)
        d.rectangle((0, 0, W, 148), fill=INK)
        d.text((84, 47), "PRISMBAY AI   /   ACTION INVENTORY", font=ft(43, True), fill=CYAN)
        d.text((86, 186), lines(chapter_title.upper(), 42, 2),
               font=ft(49, True), fill=INK, spacing=10)
        headers = ([("TEST SCENARIO", 110), ("RISK", 660),
                    ("REQUIRED CONTROL", 1140), ("EVIDENCE", 1530)]
                   if chapter_index == 6 else
                   [("BUSINESS ACTION", 110), ("AGENT ACCESS", 660),
                    ("APPROVAL", 1140), ("EVIDENCE", 1530)])
        d.rounded_rectangle((86, 373, 1830, 462), radius=14, fill=(22, 49, 72))
        for label, x in headers:
            d.text((x, 400), label, font=ft(25, True), fill=WHITE)
        chapter_rows = {
            0: [("Read invoice", "OBSERVE", "No", "Source log"),
                ("Draft response", "DRAFT", "Review", "Draft record"),
                ("Change bank", "BLOCKED", "Required", "Deny event"),
                ("Release funds", "BLOCKED", "Required", "Audit trail")],
            1: [("Inspect record", "OBSERVE", "No", "Read log"),
                ("Prepare text", "DRAFT", "Review", "Draft record"),
                ("Suggest change", "PROPOSE", "Required", "Proposal"),
                ("Execute change", "EXECUTE", "By risk", "Action log")],
            2: [("Read", "OBSERVE", "No", "Read log"),
                ("Send", "BLOCKED", "Required", "Send request"),
                ("Pay", "BLOCKED", "Required", "Payment log"),
                ("Delete", "BLOCKED", "Required", "Delete log")],
            3: [("Review request", "OBSERVE", "No", "Source record"),
                ("Draft reply", "DRAFT", "Review", "Draft record"),
                ("Correct order", "PROPOSE", "Required", "Change diff"),
                ("Pay supplier", "BLOCKED", "Required", "Bank control")],
            4: [("Submit change", "PROPOSE", "Required", "Exact diff"),
                ("Verify owner", "CHECK", "Independent", "Identity"),
                ("Apply policy", "CHECK", "Independent", "Policy log"),
                ("Execute & log", "EXECUTE", "By risk", "Receipt")],
            5: [("Time released", "MEASURE", "N/A", "40 hours"),
                ("Cash avoided", "VERIFY", "Finance", "$500"),
                ("Operating cost", "COUNT", "Finance", "$400"),
                ("Net effect", "REVIEW", "Finance", "$100")],
            6: [("Untrusted doc", "INJECTION", "Ignore commands", "Test log"),
                ("Bank change", "FRAUD", "Verify externally", "Denial log"),
                ("Changed approval", "STALE", "Stop execution", "Version check"),
                ("Tool error", "RETRY", "Prevent duplicate", "Retry record"),
                ("Reviewer denies", "DENIAL", "Stop and record", "Decision log")],
            7: [("Observe", "READ", "No", "Read log"),
                ("Draft", "STAGE", "Review", "Draft record"),
                ("Propose", "REVIEW", "Required", "Decision"),
                ("Execute", "EXECUTE", "By risk", "Action log")]
        }
        for j, row in enumerate(chapter_rows[chapter_index]):
            y = 477 + j * (88 if chapter_index == 6 else 105)
            height = 75 if chapter_index == 6 else 92
            d.rounded_rectangle((86, y, 1830, y+height), radius=12,
                                fill=(255, 255, 255) if j % 2 == 0 else (218, 233, 241),
                                outline=(184, 205, 220), width=2)
            for k, (cell, x) in enumerate(zip(row, (110, 660, 1140, 1530))):
                col = (165, 38, 52) if cell == "BLOCKED" else INK
                d.text((x, y+(22 if chapter_index == 6 else 29)), cell, font=ft(26, k==0), fill=col)
        d.text((92, 949), "FICTIONAL WORKFLOW  /  CONTROLS REQUIRE INDEPENDENT TESTING",
               font=ft(23, True), fill=INK)
    elif mode == 4:
        img = Image.new("RGB", (W, H), (13, 26, 43))
        d = ImageDraw.Draw(img)
        d.rectangle((0, 0, W, 19), fill=RED)
        if chapter_index == 6:
            d.text((92, 58), "PRISMBAY AI  /  FIVE SANDBOX TESTS",
                   font=ft(38, True), fill=CYAN)
            d.text((94, 153), "FIVE TESTS BEFORE EXPANDING PERMISSIONS",
                   font=ft(43, True), fill=WHITE)
            scenarios = [
                ("01  UNTRUSTED DOC", "Ignore injected commands", CYAN),
                ("02  BANK CHANGE", "Require separate verification", GREEN),
                ("03  STALE APPROVAL", "Stop changed transactions", AMBER),
                ("04  TOOL FAILURE", "Prevent duplicate execution", RED),
                ("05  REVIEWER DENIAL", "Stop action and log denial", CYAN),
            ]
            for j, (heading, detail, color) in enumerate(scenarios):
                row, col = (0, j) if j < 3 else (1, j-3)
                x = (95 + col*605) if row == 0 else (397 + col*605)
                y = 347 + row*277
                d.rounded_rectangle((x, y, x+535, y+227), radius=23,
                                    fill=(25, 45, 64), outline=color, width=4)
                d.text((x+24, y+37), heading, font=ft(28, True), fill=color)
                d.multiline_text((x+24, y+115), lines(detail, 27, 2),
                                 font=ft(27), fill=WHITE, spacing=9)
            d.text((95, 937), "ILLUSTRATIVE FAIL -> FIX -> RETEST. NO REAL-WORLD RESULTS CLAIMED.",
                   font=ft(24, True), fill=(188, 209, 225))
        else:
            d.text((92, 58), "PRISMBAY AI  /  PERMISSION DECISION MAP",
                   font=ft(38, True), fill=CYAN)
            d.text((94, 153), lines(chapter_title.upper(), 49, 2),
                   font=ft(46, True), fill=WHITE, spacing=8)
            quadrants = [
                ("01  OBSERVE", "Read approved records", CYAN),
                ("02  DRAFT", "Prepare, never send", GREEN),
                ("03  PROPOSE", "Named reviewer approves", AMBER),
                ("04  EXECUTE", "Technical limit + audit", RED),
            ]
            for j, (heading, detail, color) in enumerate(quadrants):
                col, row = j % 2, j // 2
                x, y = 93 + col*890, 352 + row*263
                selected = j == (slide_index % 4)
                d.rounded_rectangle((x, y, x+830, y+224), radius=25,
                                    fill=(35, 62, 78) if selected else (22, 39, 58),
                                    outline=color, width=8 if selected else 3)
                d.text((x+37, y+32), heading, font=ft(43, True), fill=color)
                d.text((x+37, y+112), detail, font=ft(32), fill=WHITE)
                if selected:
                    d.rounded_rectangle((x+610, y+28, x+791, y+77), radius=12, fill=color)
                    d.text((x+635, y+36), "FOCUS", font=ft(24, True), fill=INK)
            d.text((94, 931), "PROMPTS ARE NOT AUTHORIZATION CONTROLS",
                   font=ft(27, True), fill=(188, 209, 225))
    else:
        img = Image.new("RGB", (W, H), (35, 25, 49))
        d = ImageDraw.Draw(img)
        d.rectangle((0, 0, 35, H), fill=AMBER)
        d.text((92, 52), "PRISMBAY AI  /  EVIDENCE FLOW",
               font=ft(41, True), fill=AMBER)
        d.text((95, 145), lines(chapter_title.upper(), 48, 2),
               font=ft(49, True), fill=WHITE, spacing=10)
        phases = {
            0: ["RECEIVE", "READ", "VERIFY", "BLOCK PAY", "RECORD"],
            1: ["OBSERVE", "DRAFT", "PROPOSE", "EXECUTE"],
            2: ["LIST VERBS", "ASSESS RISK", "SET OWNER", "DENY BY DEFAULT", "TEST"],
            3: ["REQUEST", "CHECK", "DRAFT", "BUYER REVIEW", "LOG"],
            4: ["PROPOSE", "APPROVE", "VALIDATE", "EXECUTE", "AUDIT"],
            5: ["BASELINE", "TIME", "CASH", "EXCEPTIONS", "DECIDE"],
            6: ["UNTRUSTED DOC", "BANK CHANGE", "STALE APPROVAL", "TOOL FAILURE", "REVIEWER DENIAL"],
            7: ["MAP", "ASSIGN", "TEST", "MEASURE", "EXPAND"]
        }[chapter_index]
        colors = [CYAN, GREEN, AMBER, RED, CYAN]
        for j, (label, color) in enumerate(zip(phases, colors)):
            four_levels = len(phases) == 4
            step = 440 if four_levels else 352
            card_width = 380 if four_levels else 310
            x = 90 + j*step
            d.rounded_rectangle((x, 386, x+card_width, 621), radius=28,
                                fill=(24, 44, 62), outline=color, width=5)
            center = (card_width-82)//2
            d.ellipse((x+center, 412, x+center+82, 494), fill=color)
            d.text((x+center+29, 430), str(j+1), font=ft(34, True), fill=INK)
            d.multiline_text((x+24, 537), lines(label, 13, 2),
                             font=ft(28, True), fill=WHITE, spacing=7)
            if j < len(phases)-1:
                d.line((x+card_width+1, 505, x+step-5, 505), fill=WHITE, width=6)
        d.rounded_rectangle((90, 697, 1817, 889), radius=25,
                            fill=(60, 44, 69), outline=AMBER, width=3)
        d.multiline_text((129, 725), lines(summary, 84, 3),
                         font=ft(31), fill=WHITE, spacing=14)
        if chapter_index == 1:
            d.text((129, 849), "INDEPENDENT APPROVAL IS A SEPARATE CONTROL",
                   font=ft(25, True), fill=AMBER)
        d.text((94, 949), "SOURCE, OWNER, PERMISSION AND EVIDENCE AT EVERY STEP",
               font=ft(25, True), fill=AMBER)
    d.text((1620, 1001), f"{slide_index+1:02d} / {total:02d}",
           font=ft(25, True), fill=INK if mode==2 else WHITE)
    img.save(path, optimize=True)

def render_slide(chapter_index, chapter_title, slide_index, total, narration, path):
    """Six meaningful editorial layouts, with a chapter-specific original diagram.

    The scene structure changes, not merely the palette or title. This keeps
    long-form explanations legible and avoids repeated template footage.
    """
    mode = slide_index % 6
    if mode in (2, 4, 5):
        return render_executive_scene(chapter_index, chapter_title, slide_index, total, narration, path, mode)
    backgrounds = [
        (10, 20, 36), (15, 35, 46), (27, 25, 43),
        (16, 34, 32), (31, 25, 35), (13, 30, 48),
    ]
    accents = [CYAN, GREEN, AMBER, GREEN, RED, CYAN]
    bg, accent = backgrounds[mode], accents[mode]
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, 15), fill=accent)
    d.rectangle((0, 0, 22, H), fill=accent)
    for x in range(80, W, 150):
        d.line((x, 20, x, 940), fill=tuple(min(255, c+8) for c in bg), width=1)
    d.text((93, 53), "PRISMBAY AI", font=ft(39, True), fill=accent)
    d.text((96, 116), "AI SYSTEMS UNDER CONTROL  /  EXECUTIVE FIELD GUIDE",
           font=ft(23, True), fill=(175, 197, 217))
    d.line((96, 183, 1810, 183), fill=(70, 100, 124), width=2)

    # Draw the actual chapter diagram once and place it at a different
    # editorial position depending on the scene. No stock footage is used.
    diagram_canvas = Image.new("RGB", (W, H), (19, 37, 57))
    diagram(diagram_canvas_draw := ImageDraw.Draw(diagram_canvas), chapter_index, slide_index)
    graphic = diagram_canvas.crop((1150, 255, 1810, 892))
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z])", narration)
    summary = concise_summary(chapter_index, narration)
    chapter_label = chapter_title.upper()

    if mode == 0:
        d.text((100, 258), lines(chapter_label, 25, 3),
               font=ft(53, True), fill=WHITE, spacing=14)
        d.multiline_text((100, 548), lines(summary, 39, 6),
                         font=ft(34), fill=(207, 221, 236), spacing=15)
        img.paste(graphic, (1150, 255))
    elif mode == 1:
        d.text((98, 230), lines(chapter_label, 42, 2),
               font=ft(50, True), fill=WHITE, spacing=12)
        d.rounded_rectangle((94, 397, 826, 911), radius=25,
                            fill=(23, 46, 61), outline=accent, width=4)
        img.paste(graphic.resize((560, 500)), (180, 403))
        d.multiline_text((925, 470), lines(summary, 40, 7),
                         font=ft(36), fill=WHITE, spacing=17)
        d.rectangle((926, 420, 1340, 428), fill=accent)
    elif mode == 2:
        d.rounded_rectangle((89, 235, 1045, 900), radius=28,
                            fill=(38, 37, 56), outline=accent, width=3)
        d.text((135, 275), lines(chapter_label, 28, 3),
               font=ft(51, True), fill=WHITE, spacing=12)
        d.multiline_text((135, 575), lines(summary, 44, 6),
                         font=ft(31), fill=(218, 229, 239), spacing=15)
        img.paste(graphic.resize((620, 602)), (1150, 286))
        d.text((1125, 225), "CONTROL MODEL", font=ft(26, True), fill=accent)
    elif mode == 3:
        d.rounded_rectangle((98, 234, 1810, 445), radius=24,
                            fill=(22, 51, 47), outline=accent, width=3)
        d.text((142, 278), lines(chapter_label, 46, 2),
               font=ft(51, True), fill=WHITE, spacing=12)
        d.multiline_text((115, 520), lines(summary, 40, 7),
                         font=ft(33), fill=(217, 233, 225), spacing=16)
        img.paste(graphic.resize((565, 480)), (1215, 463))
        d.text((115, 855), "EVIDENCE  /  APPROVAL  /  ACCOUNTABILITY",
               font=ft(24, True), fill=accent)
    elif mode == 4:
        img.paste(graphic.resize((680, 638)), (104, 252))
        d.rounded_rectangle((855, 249, 1810, 900), radius=30,
                            fill=(43, 32, 44), outline=accent, width=3)
        d.text((903, 302), lines(chapter_label, 27, 3),
               font=ft(50, True), fill=WHITE, spacing=14)
        d.multiline_text((903, 601), lines(summary, 42, 6),
                         font=ft(30), fill=(240, 223, 232), spacing=15)
    else:
        d.text((96, 238), lines(chapter_label, 41, 2),
               font=ft(52, True), fill=WHITE, spacing=12)
        d.rectangle((96, 398, 1805, 411), fill=accent)
        d.rounded_rectangle((90, 466, 1015, 895), radius=28,
                            fill=(25, 46, 65), outline=accent, width=3)
        d.multiline_text((132, 528), lines(summary, 44, 7),
                         font=ft(34), fill=WHITE, spacing=16)
        img.paste(graphic.resize((650, 535)), (1130, 430))

    d.line((100, 951, 1810, 951), fill=(70, 100, 126), width=2)
    d.text((100, 984), "ORIGINAL PRISMBAY FRAMEWORK  |  EXAMPLES ARE HYPOTHETICAL",
           font=ft(21, True), fill=(175, 195, 212))
    d.text((1620, 984), f"{slide_index+1:02d} / {total:02d}",
           font=ft(24, True), fill=accent)
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
