#!/usr/bin/env python3
"""Original PrismBay AI Short. Render-only; publication never authorized by this script."""
import argparse, hashlib, json, subprocess, sys, wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

CHANNEL='UCw2hs85TzIpdKwJtG-BSxzQ'
VOICE='en_US-norman-medium'
W,H=1080,1920
PHRASES=[
 ('hook','Your AI agent reports one hundred completed tasks.'),
 ('hook','But finance should count accepted work, not attempts.'),
 ('quality','In this fictional example, one hundred tasks are attempted.'),
 ('quality','Only eighty pass the quality check.'),
 ('costs','Model and tool charges total forty dollars.'),
 ('costs','Human review adds another sixty dollars.'),
 ('costs','The operating cost is one hundred dollars.'),
 ('unit','Divide by eighty accepted results, not one hundred attempts.'),
 ('unit','Your true unit cost is one dollar and twenty five cents.'),
 ('unit','One dollar per attempt hides the rejection cost.'),
 ('risk','Include retries, rework, and approval time.'),
 ('close','Measure accepted outcomes. Subscribe to PrismBay AI.'),
]
CONTENT={
'hook':('THE AI OUTPUT TRAP','100 ≠ 80','COMPLETED TASKS ≠ ACCEPTED WORK','Count results your team approves.'),
'quality':('QUALITY GATE','80 / 100','80 ACCEPTED   •   20 REJECTED','Acceptance rate: 80%'),
'costs':('COUNT EVERY COST','$40 + $60','$40 TOOLS   +   $60 REVIEW','Total operating cost: $100'),
'unit':('THE REAL UNIT COST','$1.25','$100 ÷ 80 ACCEPTED RESULTS','Not $1.00 per attempted task'),
'risk':('THE HIDDEN WORK','RETRIES','REWORK   •   APPROVALS   •   ERRORS','Measure accepted outcomes.'),
'close':('PRACTICAL AI BUSINESS SYSTEMS','PRISMBAY AI','CONTROL COST   •   MEASURE VALUE','Subscribe for evidence-led AI systems.'),
}
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def cmd(a): subprocess.run([str(x) for x in a],check=True)
def digest(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1<<20),b''):h.update(b)
 return h.hexdigest()
def font(size,bold=False):return ImageFont.truetype(BOLD if bold else FONT,size)
def fit(d,t,maximum,start=90,minimum=38,bold=True):
 for n in range(start,minimum-1,-2):
  f=font(n,bold)
  if d.textbbox((0,0),t,font=f)[2]<=maximum:return f
 raise ValueError('Unfittable text: '+t)
def center(d,t,y,n,color='#f5fbff',maxwidth=945):
 f=fit(d,t,maxwidth,n)
 width=d.textbbox((0,0),t,font=f)[2]
 d.text(((W-width)/2,y),t,font=f,fill=color)
def wrap(d,text,limit,size=56):
 f=font(size,True); lines=[];line=''
 for word in text.split():
  test=(line+' '+word).strip()
  if line and d.textbbox((0,0),test,font=f)[2]>limit:
   lines.append(line);line=word
  else:line=test
 if line:lines.append(line)
 return lines

def card(scene,spoken,path,number):
 im=Image.new('RGB',(W,H),'#081c30');d=ImageDraw.Draw(im)
 d.rectangle((0,0,W,14),fill='#2bd4c8')
 d.rounded_rectangle((56,66,117,127),radius=14,fill='#2bd4c8')
 d.text((77,70),'P',font=font(44,True),fill='#081c30')
 d.text((140,76),'PRISMBAY AI',font=font(37,True),fill='#e9fbff')
 d.text((875,81),f'{number+1:02d}/12',font=font(29,True),fill='#86aebc')
 title,hero,detail,foot=CONTENT[scene]
 center(d,title,270,57,'#2bd4c8')
 d.rounded_rectangle((55,420,1025,1220),radius=54,fill='#12334b',outline='#266d79',width=4)
 center(d,hero,570,192,'#ffffff')
 center(d,detail,930,54,'#f1f8fc')
 d.line((155,1070,925,1070),fill='#367e88',width=3)
 center(d,foot,1100,52,'#9ccad6')
 if scene=='quality':
  d.rounded_rectangle((145,1170,935,1210),radius=18,fill='#823c4a')
  d.rounded_rectangle((145,1170,777,1210),radius=18,fill='#2bd4c8')
 d.text((62,1280),'ILLUSTRATIVE EXAMPLE  •  NOT CUSTOMER DATA',font=font(28,True),fill='#a4c1ce')
 # Keep text above typical bottom and right-side Shorts interface controls.
 d.rounded_rectangle((48,1360,910,1650),radius=40,fill='#030d18',outline='#205365',width=3)
 lines=wrap(d,spoken,770,56)
 if len(lines)>3: raise ValueError('Caption exceeds three lines: '+spoken)
 y=1390+(3-len(lines))*37
 for line in lines:
  f=font(56,True); width=d.textbbox((0,0),line,font=f)[2]
  d.text(((958-width)/2,y),line,font=f,fill='#ffffff');y+=76
 d.text((55,1710),'PRISMBAY AI  |  AI OPERATIONS',font=font(27,True),fill='#2bd4c8')
 im.save(path,optimize=True)

def wav_seconds(path):
 with wave.open(str(path),'rb') as w:return w.getnframes()/w.getframerate()
def stamp(s):
 ms=round(s*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);sec,ms=divmod(ms,1000)
 return f'{h:02d}:{m:02d}:{sec:02d},{ms:03d}'
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--output-dir',default='out/youtube/accepted-output-short');ap.add_argument('--voice',choices=['piper','espeak'],default='piper');a=ap.parse_args()
 out=Path(a.output_dir);out.mkdir(parents=True,exist_ok=True)
 voices=out/'voices';voices.mkdir(exist_ok=True)
 if a.voice=='piper':cmd([sys.executable,'-m','piper.download_voices','--data-dir',voices,VOICE])
 clips=[];cues=[];t=0.0
 for i,(scene,spoken) in enumerate(PHRASES):
  wav=out/f'voice-{i:02d}.wav';png=out/f'card-{i:02d}.png';mp4=out/f'clip-{i:02d}.mp4'
  if a.voice=='piper':cmd([sys.executable,'-m','piper','-m',VOICE,'--data-dir',voices,'-f',wav,'--',spoken])
  else:cmd(['espeak','-v','en-us','-s','145','-w',wav,spoken])
  tempo=0.75 if i==8 else 0.90  # Keep every burned-in caption at or below 160 WPM.
  duration=wav_seconds(wav)/tempo+0.18
  card(scene,spoken,png,i)
  cmd(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-framerate','24','-i',png,'-i',wav,'-t',f'{duration:.3f}',
       '-vf','format=yuv420p','-c:v','libx264','-preset','veryfast','-crf','22','-r','24',
       '-c:a','aac','-b:a','128k','-af',f'atempo={tempo},apad=pad_dur=0.18,volume=-2dB','-movflags','+faststart',mp4])
  # Use the encoded clip duration, not a predicted WAV/tempo duration. This prevents\n  # cumulative caption drift when FFmpeg rounds frame and AAC packet lengths.\n  encoded_duration=float(json.loads(subprocess.check_output([\n   'ffprobe','-v','error','-show_entries','format=duration','-of','json',mp4\n  ]))['format']['duration'])\n  clips.append(mp4);cues.append((t,t+encoded_duration,spoken));t+=encoded_duration
 playlist=out/'concat.txt';playlist.write_text(''.join("file '"+p.resolve().as_posix()+"'\n" for p in clips))
 video=out/'prismbay-ai-accepted-output-cost-short-review.mp4'
 cmd(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',playlist,'-c','copy','-movflags','+faststart',video])
 srt=out/'captions-phrase-synchronous.srt'
 srt.write_text(''.join(f'{i}\n{stamp(s)} --> {stamp(e)}\n{txt}\n\n' for i,(s,e,txt) in enumerate(cues,1)))
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,codec_type,width,height','-of','json',video]))
 dur=float(probe['format']['duration'])
 assert 25<dur<100 and len(cues)==12\n assert abs(dur-t)<0.35, f'Caption timeline drift exceeds 350 ms: {dur-t:+.3f}s'
 assert any(x.get('width')==1080 and x.get('height')==1920 for x in probe['streams'])
 assert any(x.get('codec_type')=='audio' for x in probe['streams'])
 manifest={'channelId':CHANNEL,'handle':'@PrismBayAI','brandId':'6945443','videoSha256':digest(video),
  'durationSeconds':round(dur,3),'sceneCount':len(CONTENT),'narrationSegments':len(PHRASES),
  'voice':VOICE if a.voice=='piper' else 'ESPEAK_LOCAL_QA_ONLY',
  'captionMode':'BURNED_IN_PHRASE_SYNCHRONIZED','captionTimingSource':'ffprobe encoded clip duration',\n  'captionTimelineDriftSeconds':round(dur-t,3),'fictionalExample':True,
  'reviewOnly':True,'publicationApproved':False,'uploadPermitted':False,'paidSpendUSD':0,
  'outstanding':['Independent full listening','Real-device YouTube UI playback','Voice model license and attribution verification','Editorial approval']}
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
