"""Deterministic FFmpeg renderer. No shell execution and no external media URLs."""
import math
import os
import re
import shutil
import subprocess
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from . import db

SIZES={'landscape':(1920,1080),'portrait':(1080,1920),'square':(1080,1080),'cinema-4k':(3840,2160)}
FONT_PATHS=[
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def font(px, bold=False):
    path = BOLD if bold and Path(BOLD).exists() else next((p for p in FONT_PATHS if Path(p).exists()),None)
    return ImageFont.truetype(path,px) if path else ImageFont.load_default()

def run(cmd):
    p=subprocess.run(cmd,capture_output=True,text=True,timeout=420)
    if p.returncode:
        raise RuntimeError('FFmpeg failed: '+p.stderr[-1200:])
    return p

def seconds_srt(t):
    ms=round(t*1000); hours,ms=divmod(ms,3600000); minutes,ms=divmod(ms,60000); seconds,ms=divmod(ms,1000)
    return f'{hours:02}:{minutes:02}:{seconds:02},{ms:03}'

def script_captions(script,duration):
    """Estimated, NOT speech-aligned. Prefer corrected SRT from OpenWhispr."""
    words=script.replace('\n',' ').split()
    if not words or duration<=0:return ''
    chunks=[' '.join(words[i:i+9]) for i in range(0,len(words),9)]
    step=duration/len(chunks)
    return '\n\n'.join(f'{i+1}\n{seconds_srt(i*step)} --> {seconds_srt((i+1)*step)}\n{text}' for i,text in enumerate(chunks))+'\n'

def safe_asset(asset_id):
    asset=db.one('SELECT * FROM assets WHERE id=?',(asset_id,))
    if not asset: raise ValueError('Asset not found')
    file=(db.BASE/'assets'/asset['saved_name']).resolve()
    if file.parent!=(db.BASE/'assets').resolve() or not file.is_file():
        raise ValueError('Invalid asset path')
    return file,asset

def background_slide(project, shot, width, height, path):
    from PIL import ImageColor
    bg=project['background'];accent=project['accent']
    canvas=Image.new('RGB',(width,height),ImageColor.getrgb(bg));d=ImageDraw.Draw(canvas)
    margin=int(width*.075);d.rounded_rectangle([margin,int(height*.10),margin+max(3,width//160),int(height*.15)],radius=3,fill=accent)
    brand=(project['client'] or 'FLAGSHIP VIDEO STUDIO').upper()
    d.text((margin+max(19,width//45),int(height*.09)),brand,font=font(max(15,width//62),bold=True),fill=accent)
    heading=shot.get('headline') or project['name']
    lines=textwrap.wrap(heading, max(13,int(width/38)))[:5]
    fontsize=min(68,max(28,int(width/18)))
    total=len(lines)*fontsize*1.24
    y=max(int(height*.32),int((height-total)/2))
    for line in lines:
        d.text((margin,int(y)),line,font=font(fontsize,bold=True),fill='#F7FBFF')
        y+=fontsize*1.24
    sub=shot.get('subtitle') or ''
    if sub:
        y+=22
        for line in textwrap.wrap(sub,max(20,int(width/25)))[:4]:
            d.text((margin,int(y)),line,font=font(max(19,width//42)),fill='#AFC3CF')
            y+=max(19,width//42)*1.35
    d.line((margin,int(height*.90),width-margin,int(height*.90)),fill=accent,width=3)
    d.text((margin,int(height*.92)),'PRODUCED WITH FLAGSHIP VIDEO STUDIO',font=font(max(12,width//76)),fill='#95AABD')
    canvas.save(path)

def photo_slide(project,shot,source,w,h,path):
    from PIL import ImageOps,ImageColor
    with Image.open(source) as src:
        im=ImageOps.fit(src.convert('RGB'),(w,h),method=Image.Resampling.LANCZOS)
    d=ImageDraw.Draw(im,'RGBA')
    d.rectangle((0,int(h*.70),w,h),fill=(6,15,31,218))
    head=(shot.get('headline') or '')
    sub=(shot.get('subtitle') or '')
    x=int(w*.065); y=int(h*.755)
    for line in textwrap.wrap(head,max(15,int(w/31)))[:2]:
        d.text((x,y),line,font=font(max(23,w//25),True),fill=(255,255,255,255));y+=max(26,w//25)*1.17
    if sub:
        d.text((x,int(h*.923)),sub[:90],font=font(max(15,w//48)),fill=(190,220,224,255))
    im.save(path)

def make_clip(source,target,duration,width,height,fps=24):
    run(['ffmpeg','-y','-hide_banner','-loglevel','error','-loop','1','-framerate',str(fps),
      '-i',str(source),'-t',str(duration),'-vf',f'scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
      '-an','-c:v','libx264','-preset','veryfast','-crf','22','-r',str(fps),'-movflags','+faststart',str(target)])

def make_video_clip(source,target,duration,width,height,fps=24):
    # Loop short clips safely and use exactly the requested shot length.
    run(['ffmpeg','-y','-hide_banner','-loglevel','error','-stream_loop','-1','-i',str(source),'-t',str(duration),
         '-vf',f'scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
         '-an','-c:v','libx264','-preset','veryfast','-crf','22','-r',str(fps),str(target)])

def render_project(project_id, job_id, progress):
    project=db.one('SELECT * FROM projects WHERE id=?',(project_id,))
    shots=db.rows('SELECT * FROM shots WHERE project_id=? ORDER BY position',(project_id,))
    if not project or not shots:raise ValueError('A project with at least one shot is required')
    if not shutil.which('ffmpeg'):raise RuntimeError('FFmpeg not installed')
    width,height=SIZES[project['format']]
    temp=(db.BASE/'temp'/job_id);temp.mkdir(exist_ok=False)
    output=db.BASE/'renders'/f'{job_id}.mp4'
    segments=[];total=0
    try:
        for i,shot in enumerate(shots):
            image=temp/f'{i:03}.png';clip=temp/f'{i:03}.mp4'
            if shot['kind'] in ('title','end'):
                background_slide(project,shot,width,height,image)
                make_clip(image,clip,shot['duration'],width,height)
            elif shot['kind']=='photo':
                if not shot['asset_id']:raise ValueError(f'Shot {i+1} is missing an image')
                src,asset=safe_asset(shot['asset_id'])
                if not asset['media_type'].startswith('image/'):
                    raise ValueError('Photo shot requires an image asset')
                photo_slide(project,shot,src,width,height,image)
                make_clip(image,clip,shot['duration'],width,height)
            elif shot['kind']=='video':
                if not shot['asset_id']:raise ValueError(f'Shot {i+1} is missing a video')
                src,asset=safe_asset(shot['asset_id'])
                if not asset['media_type'].startswith('video/'):
                    raise ValueError('Video shot requires a video asset')
                make_video_clip(src,clip,shot['duration'],width,height)
            else:raise ValueError('Unknown shot kind')
            segments.append(clip);total+=shot['duration']
            progress(int((i+1)/len(shots)*75))
        listfile=temp/'concat.txt'
        listfile.write_text(''.join(f"file '{f.as_posix()}'\n" for f in segments))
        merged=temp/'merged.mp4'
        run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0',
            '-i',str(listfile),'-c','copy',str(merged)])
        progress(84)
        srt=project.get('captions','').strip()
        if srt:
            sub=temp/'captions.srt';sub.write_text(srt,encoding='utf-8')
            video_with_subs=temp/'subtitled.mp4'
            # fixed temporary directory, no user-controlled filter file path
            run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(merged),'-vf',f'subtitles={sub.as_posix()}',
                 '-an','-c:v','libx264','-preset','veryfast','-crf','22',str(video_with_subs)])
            merged=video_with_subs
        progress(90)
        if project.get('narration_asset'):
            audio,asset=safe_asset(project['narration_asset'])
            if not asset['media_type'].startswith('audio/'):
                raise ValueError('Narration requires an audio asset')
            run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(merged),'-i',str(audio),
              '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','160k',
              '-af',f'apad=whole_dur={total:.3f}','-t',f'{total:.3f}','-movflags','+faststart',str(output)])
        else:
            shutil.copyfile(merged,output)
        progress(100)
        return str(output)
    finally:
        shutil.rmtree(temp,ignore_errors=True)
