#!/usr/bin/env python3
"""PrismBay AI original AI agent cost-controls long-form DRAFT. Never publishes."""
from __future__ import annotations
import hashlib, json, re, subprocess, sys, textwrap, wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'youtube-growth/production/2026-10-28-ai-agent-cost-control-longform-script.md'
ASSETS = ROOT / 'youtube-growth/production/assets/ai-agent-cost-control-2026-10-28/rendered'
WORK = ROOT / '.cost-controls-build'
OUT = ROOT / 'out/youtube/ai-agent-cost-controls'
CHANNEL = 'UCw2hs85TzIpdKwJtG-BSxzQ'
VOICE = 'en_US-norman-medium'
SIZE = (1920, 1080)
SCENES = ['01-budget-math.png', '01-budget-math.png', '05-pilot-scorecard.png',
          '02-eight-call-stop-rule.png', '04-authority-permissions.png',
          '03-cost-per-accepted-result.png', '05-pilot-scorecard.png',
          '06-spend-access-proof-close.png']

def run(args):
    subprocess.run([str(x) for x in args], check=True)

def font(n, bold=False):
    f = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/' + f, n)

def parse():
    raw = SOURCE.read_text(encoding='utf-8')
    body = raw.split('## Full original spoken script, scene by scene', 1)[1].split('## Packaging and native A/B candidates', 1)[0]
    chapters = []
    for section in re.split(r'(?m)^###\s+', body)[1:]:
        heading, _, body_text = section.partition('\n')
        title = heading.split('|', 1)[-1].strip()
        paras = [re.sub(r'\s+', ' ', p.strip()) for p in re.split(r'\n\s*\n', body_text)
                 if p.strip() and not p.strip().startswith('[Visual:')]
        if paras:
            chapters.append((title, paras))
    assert len(chapters) == len(SCENES) == 8
    assert sum(len(p.split()) for _, paras in chapters for p in paras) >= 1200
    return chapters

def scene(chapter, index, title, paragraph, output):
    base = Image.open(ASSETS / SCENES[chapter]).convert('RGB')
    assert base.size == SIZE
    if index % 3 == 0:
        base.save(output, optimize=True)
        return
    img = Image.new('RGB', SIZE, (8, 24, 43))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 1920, 16), fill=(31, 218, 210))
    d.text((95, 68), 'PRISMBAY AI  /  AI SYSTEMS UNDER CONTROL', font=font(36, True), fill=(49, 227, 220))
    d.text((95, 161), textwrap.shorten(title.upper(), width=47, placeholder='...'), font=font(51, True), fill='white')
    sentences = re.split(r'(?<=[.!?])\s+', paragraph)
    message = sentences[0]
    if len(message.split()) < 7 and len(sentences) > 1:
        message += ' ' + sentences[1]
    message = textwrap.shorten(message, width=158, placeholder='...')
    lines = textwrap.wrap(message, width=33)
    d.multiline_text((98, 330), '\n'.join(lines[:6]), font=font(44, True), fill='white', spacing=22)
    d.rounded_rectangle((1110, 305, 1850, 760), radius=22, fill=(24, 52, 72), outline=(31, 218, 210), width=4)
    inset = base.resize((680, 383), Image.Resampling.LANCZOS)
    img.paste(inset, (1140, 340))
    d.text((100, 880), 'Illustrative workflow. No measured customer outcome.', font=font(27), fill=(163, 203, 220))
    d.text((100, 970), f'SECTION {chapter+1:02d}  |  PRISMBAY AI', font=font(27, True), fill=(49, 227, 220))
    img.save(output, optimize=True)

def seconds(path):
    with wave.open(str(path), 'rb') as wav:
        return wav.getnframes() / wav.getframerate()

def stamp(t):
    ms = round(t*1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'

def thumbnail(kind, output):
    im = Image.new('RGB', (1280, 720), (8, 24, 43))
    d = ImageDraw.Draw(im)
    d.text((60, 44), 'PRISMBAY AI', font=font(37, True), fill=(31, 218, 210))
    if kind == 'A':
        d.text((60, 200), '$600', font=font(135, True), fill=(31, 218, 210))
        d.text((565, 232), '→', font=font(90, True), fill='white')
        d.text((730, 200), '$2,400', font=font(122, True), fill=(255, 178, 91))
        d.text((60, 460), 'SAME TASKS. 4× COST.', font=font(66, True), fill='white')
        d.text((60, 638), 'FICTIONAL EXAMPLE', font=font(27, True), fill=(169, 194, 209))
    elif kind == 'B':
        d.rounded_rectangle((80, 170, 460, 545), radius=60, fill=(181, 50, 63))
        d.text((120, 292), 'STOP', font=font(86, True), fill='white')
        d.text((530, 230), 'STOP THE', font=font(84, True), fill='white')
        d.text((530, 345), 'LOOP', font=font(118, True), fill=(255, 178, 91))
        d.text((530, 520), 'AI AGENT BUDGETS', font=font(37), fill=(175, 208, 226))
    else:
        for i, (label, color) in enumerate([('COST', (31,218,210)), ('ACCESS', (255,178,91)), ('PROOF', (144,215,180))]):
            x = 65 + i*410
            d.rounded_rectangle((x, 200, x+370, 525), radius=40, outline=color, width=7, fill=(24,52,72))
            d.text((x+25, 340), label, font=font(60, True), fill='white')
        d.text((70, 575), '3 CONTROLS BEFORE DEPLOYMENT', font=font(49, True), fill='white')
    im.save(output, optimize=True)

def main():
    chapters = parse()
    OUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    voices = WORK/'voices'
    voices.mkdir(exist_ok=True)
    run([sys.executable, '-m', 'piper.download_voices', '--data-dir', voices, VOICE])
    entries, captions, chapters_meta = [], [], []
    cursor = 0.0
    i = 0
    for ci, (title, paras) in enumerate(chapters):
        chapters_meta.append({'title':title, 'startSeconds':round(cursor, 2)})
        for j, paragraph in enumerate(paras):
            wav, png, mp4 = (WORK/f'{kind}-{i:02d}.{ext}' for kind,ext in [('voice','wav'),('scene','png'),('clip','mp4')])
            run([sys.executable, '-m', 'piper', '-m', VOICE, '--data-dir', voices, '-f', wav, '--', paragraph])
            duration = seconds(wav) + 0.22
            scene(ci, j, title, paragraph, png)
            run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-framerate','24','-i',png,
                 '-i',wav,'-t',f'{duration:.3f}','-vf','format=yuv420p','-c:v','libx264',
                 '-preset','ultrafast','-crf','30','-r','24','-c:a','aac','-b:a','112k',
                 '-af','apad=pad_dur=0.22,volume=-3dB','-movflags','+faststart',mp4])
            entries.append(mp4)
            sentences = [x.strip() for x in re.split(r'(?<=[.!?])\s+(?=[A-Z])', paragraph) if x.strip()]
            total = sum(len(x.split()) for x in sentences)
            t = cursor
            for sentence in sentences:
                dt = duration*len(sentence.split())/max(1,total)
                captions.append((t, t+dt, sentence))
                t += dt
            cursor += duration
            i += 1
    playlist = WORK/'concat.txt'
    playlist.write_text(''.join("file '" + str(x.resolve()) + "'\n" for x in entries))
    video = OUT/'ai-agent-cost-controls-draft.mp4'
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',playlist,
         '-c','copy','-movflags','+faststart',video])
    probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',video],text=True))
    actual = float(probe['format']['duration'])
    assert 420 <= actual <= 900, f'Unexpected duration {actual}; editorial review needed'
    assert any(s.get('width')==1920 and s.get('height')==1080 for s in probe['streams'])
    assert any(s.get('codec_name')=='aac' for s in probe['streams'])
    (OUT/'captions-provisional.srt').write_text(''.join(f'{n}\n{stamp(a)} --> {stamp(b)}\n{t}\n\n' for n,(a,b,t) in enumerate(captions,1)))
    for kind in 'ABC':
        thumbnail(kind, OUT/f'thumbnail_{kind}.png')
    manifest = {'channelId':CHANNEL,'handle':'@PrismBayAI','published':False,'publicationApproved':False,
                'uploadPermitted':False,'paidSpendUSD':0,'durationSeconds':round(actual,3),
                'videoSha256':hashlib.sha256(video.read_bytes()).hexdigest(),
                'scriptSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                'voice':'Piper en_US-norman-medium','chapters':chapters_meta,'sceneCount':len(entries),
                'originalIllustrations':6,'titleThumbnailCandidates':3,
                'manualNarrationReview':'PENDING','captionSynchronization':'PROVISIONAL',
                'realDevicePlayback':'PENDING','status':'UNAPPROVED_PRODUCTION_DRAFT'}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'duration':actual,'scenes':len(entries),'approved':False}))

if __name__ == '__main__':
    main()
