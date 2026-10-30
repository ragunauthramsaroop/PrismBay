#!/usr/bin/env python3
"""Private, nonpublishing retention animation for PrismBay AI Short S05.

Requires Pillow and FFmpeg. Input: existing original 1080x1920 MP4 and its SRT.
Output: new review-only MP4, with the original AAC audio stream copied intact.
"""
import argparse, hashlib, json, re, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FPS=24
W,H,Y=1080,160,770
CHANNEL='UCw2hs85TzIpdKwJtG-BSxzQ'
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
TEAL=(43,212,200,255)
ORANGE=(255,176,102,255)
WHITE=(232,245,250,255)
MUTED=(135,175,190,255)

def run(args):
 subprocess.run([str(x) for x in args],check=True)

def digest(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for block in iter(lambda:f.read(1048576),b''):h.update(block)
 return h.hexdigest()

def sec(s):
 h,m,rest=s.split(':')
 second,ms=rest.split(',')
 return int(h)*3600+int(m)*60+int(second)+int(ms)/1000

def cues_from_srt(path):
 blocks=re.split(r'\n\s*\n',Path(path).read_text(encoding='utf-8-sig').strip())
 cues=[]
 for block in blocks:
  lines=block.splitlines()
  start,end=lines[1].split(' --> ')
  cues.append((sec(start),sec(end)))
 return cues

def ease(t):
 x=max(0,min(1,t/1.1))
 return 1-(1-x)**3

def label(d,x,y,text,size=26,color=WHITE):
 d.text((x,y),text,font=ImageFont.truetype(FONT,size),fill=color)

def overlay(d,scene,phase):
 p=ease(phase)
 if scene in ('hook','quality'):
  for i in range(20):
   x=100+i*44
   d.rounded_rectangle((x,56,x+32,86),radius=7,fill=(50,88,104,100))
   if i<round(20*p):
    d.rounded_rectangle((x,56,x+32,86),radius=7,fill=TEAL if i<16 else ORANGE)
  label(d,104,9,'80 ACCEPTED',24,TEAL)
  label(d,790,9,'20 REJECTED',24,ORANGE)
  label(d,360,112,'QUALITY COUNTS',24,MUTED)
 elif scene=='costs':
  d.rounded_rectangle((110,48,970,92),radius=18,fill=(48,92,107,190))
  filled=int(860*p)
  if filled:
   d.rounded_rectangle((110,48,110+filled,92),radius=18,fill=TEAL)
   if filled>344:d.rectangle((454,48,110+filled,92),fill=ORANGE)
  label(d,110,6,'$40 TOOLS',24,TEAL)
  label(d,738,6,'$60 REVIEW',24,ORANGE)
  label(d,380,110,'$100 TOTAL',24,WHITE)
 elif scene=='unit':
  label(d,112,4,'PER ATTEMPT',23,MUTED)
  label(d,112,79,'PER ACCEPTED',23,TEAL)
  d.rounded_rectangle((350,11,350+int(410*p),37),radius=12,fill=(91,148,166,255))
  d.rounded_rectangle((350,87,350+int(512*p),113),radius=12,fill=TEAL)
  label(d,785,4,'$1.00',23,WHITE)
  label(d,880,79,'$1.25',23,TEAL)
 elif scene=='risk':
  for i,(name,col) in enumerate((('RETRY',ORANGE),('REVIEW',TEAL),('APPROVE',WHITE))):
   x=112+i*288
   d.rounded_rectangle((x,30,x+260,100),radius=16,outline=col,width=3)
   progress=max(0,min(1,(phase-i*.48)/.72))
   if progress>0:d.rectangle((x+7,37,x+7+int(246*progress),93),fill=(28,64,83,230))
   if progress>.25:label(d,x+48,51,name,23,col)
 elif scene=='close':
  d.rounded_rectangle((128,47,950,94),radius=20,fill=(34,78,96,190))
  d.rounded_rectangle((128,47,128+int(822*p),94),radius=20,fill=TEAL)
  label(d,290,8,'MEASURE ACCEPTED WORK',25,WHITE)
  label(d,350,114,'SUBSCRIBE FOR SYSTEMS',23,MUTED)

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--input',required=True)
 ap.add_argument('--srt',required=True)
 ap.add_argument('--out',required=True)
 args=ap.parse_args()
 src=Path(args.input);out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
 cues=cues_from_srt(args.srt)
 assert len(cues)==12 and cues[0][0]<.01
 assert all(cues[i][0]>=cues[i-1][1]-.005 for i in range(1,len(cues)))
 assert Y+H<=930 and Y+H<1360
 meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',src]))
 duration=float(meta['format']['duration'])
 assert abs(cues[-1][1]-duration)<.2
 frames=round(duration*FPS)
 scenes=['hook','hook','quality','quality','costs','costs','costs','unit','unit','unit','risk','close']
 tmp=out.with_suffix('.overlay.mov')
 cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo',
      '-pixel_format','rgba','-video_size',f'{W}x{H}','-framerate',str(FPS),
      '-i','pipe:0','-c:v','qtrle','-pix_fmt','argb',str(tmp)]
 proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
 idx=0
 try:
  for frame in range(frames):
   t=frame/FPS
   while idx<len(cues)-1 and t>=cues[idx][1]:idx+=1
   im=Image.new('RGBA',(W,H),(0,0,0,0))
   overlay(ImageDraw.Draw(im),scenes[idx],t-cues[idx][0])
   proc.stdin.write(im.tobytes())
  proc.stdin.close()
  if proc.wait()!=0:raise RuntimeError('Overlay encoding failed')
 except BaseException:
  proc.kill()
  raise
 run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',src,'-i',tmp,
      '-filter_complex',f'[0:v][1:v]overlay=0:{Y}:shortest=1:format=auto,format=yuv420p[v]',
      '-map','[v]','-map','0:a:0','-c:v','libx264','-threads','2','-preset','ultrafast',
      '-crf','19','-r',str(FPS),'-c:a','copy','-movflags','+faststart',out])
 tmp.unlink()
 manifest={'channelId':CHANNEL,'handle':'@PrismBayAI','metricoolBrandId':6945443,
           'sourceVideoSha256':digest(src),'reviewVideoSha256':digest(out),
           'durationSeconds':duration,'sourceCaptionCues':len(cues),'animatedCueCount':12,
           'overlayY':[Y,Y+H],'captionAreaStartsY':1360,
           'audioStream':'copied unchanged; compare hashes in QA',
           'publicationApproved':False,'uploadPermitted':False,'paidSpendUSD':0,
           'status':'RETENTION_REVIEW_ONLY',
           'outstanding':['Full narration listening','Actual YouTube mobile playback','Final editorial approval']}
 out.with_suffix('.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps(manifest,indent=2))

if __name__=='__main__':main()
