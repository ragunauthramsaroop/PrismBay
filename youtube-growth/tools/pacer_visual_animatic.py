#!/usr/bin/env python3
"""Render a private, silent PACER storyboard animatic from original SVGs.

Never a finished video, release approval, scheduled upload or synthetic narration.
Requires: Python 3, cairosvg, Pillow, FFmpeg, FFprobe. No network or paid APIs.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

AUTHORIZED = 'UCw2hs85TzIpdKwJtG-BSxzQ'

def run(cmd):
    return subprocess.run(cmd, check=True, text=True, capture_output=True).stdout

def validate(plan, assets):
    assert plan['channel_id'] == AUTHORIZED and plan['handle'] == '@PrismBayAI'
    assert plan['paid_spend_usd'] == 0
    assert not plan['release_gates']['public_upload_permitted']
    assert not plan['release_gates']['real_narration_recording']
    scenes = plan['proposed_scenes']
    assert len(scenes) == 22
    cursor = 0
    for i, scene in enumerate(scenes, 1):
        assert scene['scene'] == i and scene['start_s'] == cursor
        assert scene['end_s'] > cursor
        assert scene['script_section'] in range(1, 12)
        path = assets / scene['asset']
        assert path.is_file(), f'Missing source SVG: {path}'
        assert '<svg' in path.read_text(encoding='utf-8')[:200]
        cursor = scene['end_s']
    assert cursor == 570
    return scenes

def make_animatic(plan_path, assets, output, width=960, fps=6):
    import cairosvg
    from PIL import Image, ImageDraw, ImageFont
    plan = json.loads(plan_path.read_text(encoding='utf-8'))
    scenes = validate(plan, assets)
    assert width in (960, 1280, 1920)
    assert fps in (6, 12, 24)
    assert shutil.which('ffmpeg') and shutil.which('ffprobe')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='prismbay_animatic_') as td:
        tmp = Path(td)
        lines = ['ffconcat version 1.0']
        for scene in scenes:
            png = tmp / f"scene_{scene['scene']:02d}.png"
            cairosvg.svg2png(url=str(assets / scene['asset']), write_to=str(png), output_width=width, output_height=width * 9 // 16)
            # The source SVG footer contains the original, superseded timing.
            # Replace it with the proposed timing to avoid a false sync claim.
            with Image.open(png) as original:
                img = original.convert('RGB')
            draw = ImageDraw.Draw(img)
            hh = img.height
            draw.rectangle((0, int(hh * .79), width, hh - 36), fill=(9, 21, 40))
            font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', max(13, width // 64))
            def clock(seconds): return f'{seconds // 60:02d}:{seconds % 60:02d}'
            label = f"PROPOSED {clock(scene['start_s'])} - {clock(scene['end_s'])}  |  SCENE {scene['scene']:02d}/22  |  AUDIO NOT MEASURED"
            draw.text((int(width * .045), int(hh * .82)), label, font=font, fill=(169, 189, 212))
            draw.text((int(width * .045), int(hh * .89)), 'ORIGINAL EDUCATIONAL GRAPHIC  |  FICTIONAL CASE WHERE NOTED', font=font, fill=(255, 196, 118))
            img.save(png)
            lines += [f"file '{png}'", f"duration {scene['end_s'] - scene['start_s']}"]
        lines.append(f"file '{tmp / 'scene_22.png'}'")
        concat = tmp / 'frames.ffconcat'
        concat.write_text('\n'.join(lines) + '\n', encoding='utf-8')
        h = width * 9 // 16
        font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
        vf = (f'fps={fps},format=yuv420p,'
              f'drawbox=x=0:y={h-36}:w={width}:h=36:color=black@0.84:t=fill,'
              f"drawtext=fontfile={font}:text='PRIVATE VISUAL PREVIEW  |  NO VOICEOVER  |  NOT FOR PUBLICATION':"
              f'fontsize={max(13,width//65)}:fontcolor=white:x=20:y={h-27},'
              f"drawtext=fontfile={font}:text='%{{pts\\:hms}}':"
              f'fontsize={max(13,width//65)}:fontcolor=white:x=w-tw-20:y=18')
        run(['ffmpeg','-hide_banner','-loglevel','error','-y','-safe','0','-f','concat','-i',str(concat),
             '-vf',vf,'-t','570','-an','-c:v','libx264','-preset','veryfast','-crf','25',
             '-pix_fmt','yuv420p','-movflags','+faststart','-metadata','artist=@PrismBayAI',
             '-metadata','comment=PRIVATE VISUAL ANIMATIC. NOT FOR PUBLICATION. NO NARRATION.',str(output)])
    probe = json.loads(run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,width,height,avg_frame_rate',
                            '-of','json',str(output)]))
    duration = float(probe['format']['duration'])
    assert abs(duration - 570) < 0.5, f'Unexpected animatic duration: {duration}'
    assert probe['streams'][0]['width'] == width
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    manifest = {
        'channel_id':AUTHORIZED,'handle':'@PrismBayAI',
        'status':'SILENT_PRIVATE_VISUAL_ANIMATIC_NOT_A_FINAL_VIDEO_NOT_PUBLISHED',
        'source_plan':plan_path.name,'scene_count':22,'expected_duration_seconds':570,
        'measured_duration_seconds':duration,'fps':fps,'resolution':[width,width*9//16],
        'audio_present':False,'narration_recorded':False,'captions_synced':False,
        'rights_approved':False,'editorial_approved':False,'public_upload_permitted':False,
        'paid_spend_usd':0,'sha256':digest,'file':output.name
    }
    output.with_suffix('.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(manifest,indent=2))
    return manifest

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--plan',type=Path,required=True)
    parser.add_argument('--assets',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--width',type=int,default=960)
    parser.add_argument('--fps',type=int,default=6)
    args=parser.parse_args()
    make_animatic(args.plan,args.assets,args.out,args.width,args.fps)
