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
        frame = render_frame(segment, i, len(segments), spec.get('sourceAttribution', ''))
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
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '160k',
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
