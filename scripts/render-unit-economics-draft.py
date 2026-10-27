#!/usr/bin/env python3
"""Zero-cost original PrismBay unit-economics Short. Produces an unpublished QA draft."""
import hashlib
import json
import shutil
import subprocess
import sys
import wave
from pathlib import Path

from youtube_visual_unit_economics import render_frame_unit_economics

CHANNEL = 'UCw2hs85TzIpdKwJtG-BSxzQ'
SLUG = 'ai-cost-per-accepted-result-2026-10-27'

def run(args, check=True):
    return subprocess.run(args, check=check, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

def voice(text, wav, voice_dir):
    text = text.replace('PrismBay', 'Prism Bay')
    model = 'en_US-norman-medium'
    if shutil.which('python3'):
        try:
            run(['python3', '-m', 'piper', '-m', model, '--data-dir', str(voice_dir), '-f', str(wav), '--', text])
            return 'piper'
        except (subprocess.CalledProcessError, OSError):
            pass
    engine = shutil.which('espeak-ng') or shutil.which('espeak')
    if not engine:
        raise RuntimeError('No free local speech synthesizer available')
    run([engine, '-v', 'en-us', '-s', '174', '-p', '42', '-a', '160', '-w', str(wav), text])
    return 'espeak'

def duration(wav):
    with wave.open(str(wav), 'rb') as a:
        return a.getnframes() / a.getframerate()

def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: render-unit-economics-draft.py SPEC.json')
    spec = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    if (spec.get('targetChannelId') != CHANNEL or spec.get('slug') != SLUG
        or spec.get('visualStyle') != 'unit_economics_v1'
        or spec.get('publicationApproved') is not False
        or spec.get('paidSpendUSD') != 0):
        raise ValueError('Unauthorized channel, request or release status')
    segments = spec['segments']
    if len(segments) != 7:
        raise ValueError('Exactly seven scenes required')
    root = Path.cwd()
    work = root / '.youtube-render' / SLUG
    out = root / 'public' / 'youtube'
    voices = work / 'voices'
    for p in (work, out, voices):
        p.mkdir(parents=True, exist_ok=True)
    try:
        run(['python3', '-m', 'piper.download_voices', '--data-dir', str(voices), 'en_US-norman-medium'])
    except (subprocess.CalledProcessError, OSError):
        pass
    clips = []
    engines = set()
    for i, segment in enumerate(segments):
        png = work / f'{i:02}.png'
        wav = work / f'{i:02}.wav'
        mp4 = work / f'{i:02}.mp4'
        render_frame_unit_economics(segment, i, len(segments), spec.get('sourceAttribution', '')).save(png)
        engines.add(voice(segment['spoken'], wav, voices))
        seconds = max(1.0, duration(wav) + 0.18)
        # Hard cuts keep the first frame visible and avoid black flashes at scene changes.
        # Do not fade to/from black: Shorts must show the hook immediately.
        filt = ("scale=1120:1992,crop=1080:1920:"
                "x='20+10*sin(t*0.7)':y='36+10*cos(t*0.5)',"
                "fps=30,format=yuv420p")
        run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-i',str(png),
             '-i',str(wav),'-t',f'{seconds:.3f}','-vf',filt,'-c:v','libx264',
             '-preset','fast','-crf','21','-c:a','aac','-b:a','160k',
             '-ar','44100','-shortest',str(mp4)])
        clips.append(mp4)
    concat = work / 'concat.txt'
    concat.write_text(''.join(f"file '{p.resolve().as_posix()}'\n" for p in clips))
    output = out / (SLUG + '.mp4')
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0',
         '-i',str(concat),'-c','copy','-movflags','+faststart',str(output)])
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    manifest = {'slug':SLUG,'channelId':CHANNEL,'sha256':digest,
                'ttsEngines':sorted(engines),'publicationApproved':False,
                'paidSpendUSD':0,'qualityGate':'CLOSED_PENDING_FULL_AUDIO_VISUAL_CAPTION_QA',
                'sourceAttribution':spec.get('sourceAttribution','')}
    (out / (SLUG + '.json')).write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(manifest,indent=2))

if __name__ == '__main__':
    main()
