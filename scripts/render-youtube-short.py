#!/usr/bin/env python3
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import textwrap
import wave

from PIL import Image, ImageDraw, ImageFont
from youtube_visual_ledger import render_frame_ledger
from youtube_incident_visual import render_frame_incident
from youtube_visual_trust import render_frame_trust
from youtube_visual_regression import render_frame_regression

WIDTH, HEIGHT = 1080, 1920
BG = (8, 12, 20)
PANEL = (20, 29, 45)
TEXT = (244, 247, 252)
MUTED = (174, 188, 207)
ACCENT = (81, 224, 255)
ACCENT2 = (142, 255, 171)


def run(args, **kwargs):
    print('+', ' '.join(map(str, args)), flush=True)
    return subprocess.run(args, check=True, **kwargs)


def font(size, bold=False):
    name = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    paths = [
        f'/usr/share/fonts/truetype/dejavu/{name}',
        f'/usr/share/fonts/dejavu/{name}',
    ]
    for p in paths:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def wrap(text, width):
    lines = []
    for paragraph in str(text).split('\n'):
        lines.extend(textwrap.wrap(paragraph, width=width) or [''])
    return '\n'.join(lines)


def wav_duration(path):
    with wave.open(str(path), 'rb') as f:
        return f.getnframes() / float(f.getframerate())


def synthesize(text, out_path, voice, voice_dir):
    piper_ok = shutil.which('python3') is not None
    if piper_ok:
        try:
            run(['python3', '-m', 'piper', '-m', voice, '--data-dir', str(voice_dir), '-f', str(out_path), '--', text])
            return 'piper'
        except Exception as exc:
            print(f'Piper synthesis failed, using eSpeak fallback: {exc}', file=sys.stderr)
    if not shutil.which('espeak-ng'):
        raise RuntimeError('No zero-cost local TTS engine available')
    run(['espeak-ng', '-v', 'en-us', '-s', '176', '-p', '42', '-a', '165', '-w', str(out_path), text])
    return 'espeak-ng'


def render_frame(segment, index, total, source):
    img = Image.new('RGB', (WIDTH, HEIGHT), BG)
    d = ImageDraw.Draw(img)

    # Original geometric background, no stock or copied imagery.
    d.ellipse((760, -140, 1240, 340), fill=(13, 32, 51))
    d.ellipse((-220, 1450, 360, 2030), fill=(11, 37, 43))
    d.rounded_rectangle((74, 110, 1006, 1810), radius=44, fill=PANEL)

    d.text((110, 155), 'PRISMBAY AI', font=font(34, True), fill=ACCENT)
    d.text((110, 208), 'PRACTICAL AI BUSINESS SYSTEMS', font=font(22, True), fill=MUTED)

    headline = wrap(segment.get('headline', ''), 19)
    body = wrap(segment.get('body', ''), 31)
    key = str(segment.get('key', '')).strip()

    y = 390
    if key:
        d.text((110, y), key, font=font(98, True), fill=ACCENT2)
        y += 150
    d.multiline_text((110, y), headline, font=font(72, True), fill=TEXT, spacing=18)
    y += 110 * max(1, headline.count('\n') + 1) + 50
    if body:
        d.multiline_text((110, y), body, font=font(42, False), fill=MUTED, spacing=18)

    badges = segment.get('badges') or []
    if badges:
        by = 1330
        for label in badges[:3]:
            d.rounded_rectangle((110, by, 970, by + 108), radius=26, outline=(58, 88, 118), width=3, fill=(13, 22, 35))
            d.text((145, by + 27), str(label), font=font(34, True), fill=TEXT)
            by += 128

    if segment.get('source') and source:
        d.text((110, 1640), wrap(source, 52), font=font(24, False), fill=MUTED)

    progress_x1, progress_x2 = 110, 970
    d.rounded_rectangle((progress_x1, 1740, progress_x2, 1754), radius=7, fill=(39, 55, 74))
    filled = progress_x1 + int((progress_x2 - progress_x1) * ((index + 1) / total))
    d.rounded_rectangle((progress_x1, 1740, filled, 1754), radius=7, fill=ACCENT)
    d.text((110, 1780), f'{index + 1}/{total}', font=font(22, True), fill=MUTED)
    return img



def render_frame_decision(segment, index, total, source):
    """Original diagram-led editorial visual system, distinct from the legacy card template."""
    img = Image.new('RGB', (WIDTH, HEIGHT), (7, 14, 28))
    d = ImageDraw.Draw(img)
    cyan, lime, amber, red = (86, 225, 239), (180, 244, 156), (255, 195, 95), (255, 112, 115)
    white, pale = (246, 250, 255), (181, 197, 215)
    for yy in range(0, HEIGHT, 80):
        d.line((0, yy, WIDTH, yy), fill=(16, 30, 48), width=1)
    for xx in range(0, WIDTH, 80):
        d.line((xx, 0, xx, HEIGHT), fill=(16, 30, 48), width=1)
    d.rectangle((0, 0, WIDTH, 22), fill=cyan)
    d.text((80, 82), 'PRISMBAY  /  AI SYSTEMS', font=font(33, True), fill=cyan)
    d.text((80, 151), 'ARCHITECTURE DECISION  •  FIELD GUIDE', font=font(22, True), fill=pale)
    d.line((80, 218, 1000, 218), fill=(70, 94, 119), width=2)
    headline = wrap(segment.get('headline', ''), 22)
    d.multiline_text((80, 290), headline, font=font(65, True), fill=white, spacing=14)
    scene = segment.get('scene', 'decision')
    def card(x1, y1, x2, y2, label, border, fill=(15, 32, 51), fsize=43):
        d.rounded_rectangle((x1, y1, x2, y2), radius=30, fill=fill, outline=border, width=5)
        box = d.textbbox((0, 0), label, font=font(fsize, True))
        tw, th = box[2]-box[0], box[3]-box[1]
        d.text(((x1+x2-tw)/2, (y1+y2-th)/2-6), label, font=font(fsize, True), fill=white)
    if scene == 'hook':
        card(78, 690, 500, 1030, 'RULES', cyan, fsize=63)
        card(580, 690, 1002, 1030, 'AI AGENT', amber, fsize=53)
        d.text((510, 825), 'OR', font=font(36, True), fill=pale)
        card(135, 1110, 945, 1250, 'MATCH THE TOOL TO THE TASK', lime, fsize=32)
    elif scene == 'rules':
        for y, label in [(630, 'KNOWN INPUT'), (855, 'TESTABLE RULE'), (1080, 'AUTOMATIC ROUTE')]:
            card(160, y, 920, y+148, label, cyan, fsize=46)
        d.line((540, 782, 540, 855), fill=lime, width=10)
        d.line((540, 1007, 540, 1080), fill=lime, width=10)
    elif scene == 'split':
        card(80, 650, 1000, 855, 'ROUTINE CASE  →  RULES', lime, fsize=44)
        card(80, 950, 1000, 1155, 'AMBIGUOUS CASE  →  AI DRAFT', amber, fsize=38)
        d.text((180, 1230), 'Different inputs. Different controls.', font=font(33), fill=pale)
    elif scene == 'draft':
        card(95, 690, 460, 900, 'READ', cyan, fsize=49)
        card(620, 690, 985, 900, 'DRAFT', amber, fsize=49)
        d.line((470, 800, 610, 800), fill=lime, width=10)
        card(180, 1030, 900, 1225, 'HUMAN REVIEWS', lime, fsize=50)
    elif scene == 'risk':
        card(125, 660, 955, 915, 'AI ASSISTANT', cyan, fsize=58)
        d.line((540, 922, 540, 1105), fill=red, width=13)
        d.line((340, 1015, 740, 1015), fill=red, width=20)
        card(185, 1110, 895, 1285, 'PAYMENT BLOCKED', red, fsize=45)
    elif scene == 'score':
        for y, label, col in [(610, 'COST PER ACCEPTED RESULT', cyan), (835, 'ERRORS AND REWORK', amber), (1060, 'HUMAN ACCOUNTABILITY', lime)]:
            card(90, y, 990, y+155, label, col, fsize=34)
    elif scene == 'close':
        card(100, 640, 980, 845, 'RULES FIRST', cyan, fsize=69)
        card(100, 915, 980, 1120, 'AI FOR EXCEPTIONS', amber, fsize=52)
        d.text((235, 1240), 'Keep authority with people.', font=font(37, True), fill=lime)
    else:
        card(100, 690, 980, 1100, 'BUILD THE SIMPLEST SAFE FLOW', cyan, fsize=35)
    body = wrap(segment.get('body', ''), 37)
    if body:
        d.multiline_text((86, 1445), body, font=font(34), fill=pale, spacing=15)
    d.line((80, 1735, 1000, 1735), fill=(65, 88, 112), width=2)
    d.rounded_rectangle((80, 1773, 1000, 1789), radius=8, fill=(36, 56, 76))
    d.rounded_rectangle((80, 1773, 80+int(920*(index+1)/total), 1789), radius=8, fill=cyan)
    d.text((80, 1820), 'PRISMBAY AI  •  PRACTICAL AI BUSINESS SYSTEMS', font=font(24, True), fill=pale)
    return img


def render_frame_boardroom(segment, index, total, source):
    """PrismBay original light editorial briefing system for FSB 2026 explainer."""
    img = Image.new('RGB', (WIDTH, HEIGHT), (244, 247, 250))
    d = ImageDraw.Draw(img)
    ink, slate, orange, teal, red = (21, 36, 53), (84, 103, 123), (235, 110, 59), (0, 135, 144), (195, 53, 58)
    d.rectangle((0, 0, WIDTH, 30), fill=ink)
    d.rectangle((0, 30, 23, HEIGHT), fill=orange)
    d.text((82, 91), 'PRISMBAY  /  EXECUTIVE BRIEF', font=font(35, True), fill=ink)
    d.text((83, 157), 'AI GOVERNANCE  |  OCTOBER 2026', font=font(26, True), fill=slate)
    d.line((83, 218, 995, 218), fill=(198, 207, 216), width=3)
    headline = wrap(segment.get('headline', ''), 19)
    d.multiline_text((83, 286), headline, font=font(69, True), fill=ink, spacing=17)
    scene = segment.get('scene', 'board')
    def centered(label, box, size, color=ink, bold=True):
        x1,y1,x2,y2=box
        ft=font(size,bold)
        bounds=d.textbbox((0,0),label,font=ft)
        w=bounds[2]-bounds[0]
        h=bounds[3]-bounds[1]
        d.text((x1+(x2-x1-w)/2,y1+(y2-y1-h)/2-6),label,font=ft,fill=color)
    def tile(box,label,stroke=teal,fill=(255,255,255),size=40):
        d.rounded_rectangle(box,radius=23,fill=fill,outline=stroke,width=5)
        centered(label,box,size,ink)
    if scene == 'opening':
        d.rounded_rectangle((86, 680, 993, 1125), radius=28, fill=ink)
        centered('12 SOUND PRACTICES',(90, 715, 989, 870),53,(255,255,255))
        centered('3 BOARD TESTS',(90, 880, 989, 1075),75,(255,187,125))
        d.text((124, 1195),'FSB guidance for financial institutions',font=font(32,True),fill=slate)
    elif scene == 'owner':
        tile((90, 670, 990, 830),'BOARD / SENIOR MANAGEMENT',orange,size=39)
        d.line((540,830,540,915),fill=orange,width=11)
        tile((140, 920, 940, 1100),'NAMED PROCESS OWNER',teal,size=46)
        d.line((540,1100,540,1185),fill=teal,width=11)
        tile((205, 1190, 875, 1350),'APPROVAL BOUNDARY',red,size=40)
    elif scene == 'evidence':
        d.line((155, 1220, 940, 1220),fill=slate,width=6)
        d.line((155, 760, 155, 1220),fill=slate,width=6)
        for x,h,col in [(245,220,slate),(430,310,teal),(615,165,orange),(800,350,teal)]:
            d.rounded_rectangle((x,1220-h,x+112,1220),radius=12,fill=col)
        d.text((165, 1290),'TEST  >  MONITOR  >  RECORD',font=font(42,True),fill=ink)
    elif scene == 'stop':
        tile((110, 710, 425, 900),'RUN',teal,size=63)
        tile((650, 710, 970, 900),'PAUSE',orange,size=59)
        d.line((432, 807, 640, 807),fill=ink,width=12)
        tile((230, 1050, 850, 1245),'REVOKE ACCESS',red,size=53)
        d.line((540, 905, 540, 1042),fill=red,width=13)
        d.text((192, 1320),'Test intervention before launch.',font=font(35,True),fill=slate)
    elif scene == 'test':
        for j,(label,col) in enumerate([('01  ACCOUNTABLE OWNER',orange),('02  PERFORMANCE EVIDENCE',teal),('03  TESTED STOP ROUTE',red)]):
            y=675+j*235
            d.rounded_rectangle((105,y,975,y+168),radius=20,fill=(255,255,255),outline=col,width=5)
            d.rectangle((125,y+43,190,y+108),outline=col,width=7)
            d.text((220,y+51),label,font=font(37,True),fill=ink)
    elif scene == 'close':
        d.rounded_rectangle((112, 725, 968, 1150),radius=38,fill=ink)
        centered('GOVERN BEFORE',(120,765,960,920),66,(255,255,255))
        centered('YOU DEPLOY',(120,945,960,1090),77,(255,183,119))
        d.text((182,1245),'PRISMBAY AI  |  PRACTICAL SYSTEMS',font=font(31,True),fill=teal)
    else:
        tile((130,730,950,1100),'MEASURE  |  CONTROL  |  LEARN',teal,size=33)
    body=wrap(segment.get('body',''),35)
    if body:
        d.multiline_text((105, 1490),body,font=font(35),fill=slate,spacing=16)
    d.line((83, 1733, 992, 1733),fill=(194,207,218),width=3)
    d.rounded_rectangle((83, 1780, 993, 1798),radius=8,fill=(218,227,232))
    d.rounded_rectangle((83, 1780, 83+int(910*(index+1)/total), 1798),radius=8,fill=orange)
    d.text((83, 1840),f'PRISMBAY AI   /   {index+1:02d} OF {total:02d}',font=font(28,True),fill=ink)
    return img

def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: render-youtube-short.py SPEC.json')
    spec_path = Path(sys.argv[1]).resolve()
    spec = json.loads(spec_path.read_text())
    slug = spec['slug']
    segments = spec['segments']
    if not segments or len(segments) > 12:
        raise ValueError('Spec must contain 1-12 segments')

    root = Path(os.environ.get('GITHUB_WORKSPACE', Path.cwd())).resolve()
    work = root / '.youtube-render' / slug
    voice_dir = work / 'voices'
    out_dir = root / 'public' / 'youtube'
    work.mkdir(parents=True, exist_ok=True)
    voice_dir.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)

    voice = spec.get('voice', 'en_US-norman-medium')
    engine = 'espeak-ng'
    try:
        run(['python3', '-m', 'piper.download_voices', '--data-dir', str(voice_dir), voice])
        engine = 'piper'
    except Exception as exc:
        print(f'Piper voice download failed, eSpeak remains available: {exc}', file=sys.stderr)

    segment_files = []
    used_engines = set()
    for i, segment in enumerate(segments):
        stem = f'{i:02d}'
        wav = work / f'{stem}.wav'
        png = work / f'{stem}.png'
        mp4 = work / f'{stem}.mp4'
        spoken = str(segment['spoken']).strip()
        used = synthesize(spoken, wav, voice, voice_dir) if engine == 'piper' else synthesize(spoken, wav, '__missing__', voice_dir)
        used_engines.add(used)
        duration = max(1.0, wav_duration(wav) + 0.18)
        frame = (render_frame_regression(segment, i, len(segments), spec.get('sourceAttribution', ''))
                 if spec.get('visualStyle') == 'regression_lab_v1'
                 else render_frame_trust(segment, i, len(segments), spec.get('sourceAttribution', ''))
                 if spec.get('visualStyle') == 'trust_boundary_v5'
                 else render_frame_incident(segment, i, len(segments), spec.get('sourceAttribution', ''))
                 if spec.get('visualStyle') == 'incident_v4'
                 else render_frame_ledger(segment, i, len(segments), spec.get('sourceAttribution', ''))
                 if spec.get('visualStyle') == 'ledger_v1'
                 else render_frame_decision(segment, i, len(segments), spec.get('sourceAttribution', ''))
                 if spec.get('visualStyle') == 'decision_tree_v2'
                 else render_frame_boardroom(segment, i, len(segments), spec.get('sourceAttribution', ''))
                 if spec.get('visualStyle') == 'boardroom_v3'
                 else render_frame(segment, i, len(segments), spec.get('sourceAttribution', '')))
        frame.save(png, optimize=True)
        fade_out = max(0.1, duration - 0.16)
        vf = (
            "scale=1120:1992,crop=1080:1920:"
            "x='20+10*sin(t*0.7)':y='36+10*cos(t*0.5)',"
            f"fps=30,fade=t=in:st=0:d=0.12,fade=t=out:st={fade_out:.3f}:d=0.12,format=yuv420p"
        )
        run([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-i', str(png), '-i', str(wav),
            '-t', f'{duration:.3f}', '-vf', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
            '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-shortest', str(mp4)
        ])
        segment_files.append(mp4)

    concat = work / 'concat.txt'
    concat.write_text(''.join(f"file '{p.as_posix()}'\n" for p in segment_files))
    output = out_dir / f'{slug}.mp4'
    run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-af', 'volume=-3dB', '-c:a', 'aac', '-b:a', '160k',
        '-movflags', '+faststart', '-pix_fmt', 'yuv420p', str(output)
    ])

    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    meta = {
        'slug': slug,
        'title': spec.get('title', ''),
        'sha256': digest,
        'ttsEngines': sorted(used_engines),
        'voice': voice if 'piper' in used_engines else None,
        'voiceLicenseBasis': spec.get('voiceLicenseBasis', ''),
        'sourceAttribution': spec.get('sourceAttribution', ''),
        'originalProgrammaticVisuals': True,
        'paidSpend': 0,
        'channelId': 'UCw2hs85TzIpdKwJtG-BSxzQ'
    }
    (out_dir / f'{slug}.json').write_text(json.dumps(meta, indent=2) + '\n')
    print(json.dumps(meta, indent=2))


if __name__ == '__main__':
    main()
