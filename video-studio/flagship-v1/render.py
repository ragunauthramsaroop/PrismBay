#!/usr/bin/env python3
"""Original review-only 30-second film, with optional authorized media imports."""
import argparse
import json
import math
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
MANIFEST = json.loads((ROOT / "manifest.json").read_text())
BG, CYAN, GOLD, WHITE, GREY = "#071322", "#4ae3d3", "#f1c688", "#eef6fa", "#a4b7c3"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
HEAVY = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def write(draw, pos, string, size=30, color=WHITE, bold=False):
    draw.text(pos, string, fill=color, font=ImageFont.truetype(HEAVY if bold else FONT, size))

def frame(index, path):
    scene = MANIFEST["scenes"][index]
    img = Image.new("RGB", (1280,720), BG)
    dr = ImageDraw.Draw(img)
    for x in range(75,1280,65):
        dr.line((x,0,x,720),fill="#102538",width=1)
    for y in range(35,720,65):
        dr.line((0,y,1280,y),fill="#102538",width=1)
    dr.rectangle((0,0,8,720),fill=CYAN)
    dr.line((75,110,1200,110),fill="#30475a",width=2)
    dr.line((75,655,1200,655),fill="#30475a",width=2)
    write(dr,(75,55),"P / PRISMBAY",25,CYAN,True)
    write(dr,(1060,55),"VIDEO STUDIO",16,GREY,True)
    write(dr,(75,175),f"SCENE {index+1:02}  /  06",24,GOLD,True)
    title = scene["title"].split(" ")
    if len(title)>3:
        split=len(title)//2
        lines=[" ".join(title[:split])," ".join(title[split:])]
    else:
        lines=[" ".join(title)]
    for j,line in enumerate(lines):
        maxchars=max(1,len(line))
        size=min(77,max(38,int(1140/maxchars*1.54)))
        write(dr,(75,270+j*115),line,size,WHITE if j==0 else CYAN,True)
    write(dr,(80,528),scene["subtitle"],23,GREY)
    dr.line((80,583,1130,583),fill=GOLD,width=4)
    if index==3:
        for k in range(65):
            amp=10+int(25*abs(math.sin(k*.41)+math.sin(k*.19)))
            x=84+k*16
            dr.line((x,610-amp//2,x,610+amp//2),fill=CYAN if k<45 else GOLD,width=5)
    else:
        for k in range(3):
            off=k*18
            dr.arc((1040-off,190-off,1210+off,360+off),15,300,fill=CYAN if k==0 else GOLD,width=3)
    write(dr,(77,676),"ORIGINAL DEMONSTRATION  /  REVIEW ONLY",16,GREY)
    write(dr,(1120,676),f"{index+1:02}/06",16,CYAN,True)
    img.save(path)

def score(path):
    rate=16000
    with wave.open(str(path),"wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        buf=bytearray()
        for n in range(rate*30):
            t=n/rate
            amp=min(1,t/1.5,(30-t)/1.8)
            v=.17*math.sin(2*math.pi*110*t)+.06*math.sin(2*math.pi*164.81*t)+.04*math.sin(2*math.pi*220*t)
            for start in range(0,30,5):
                x=t-start
                if 0<=x<=1.3:
                    v+=.09*math.exp(-3*x)*math.sin(2*math.pi*440*x)
            sample=int(max(-1,min(1,v*amp))*32000)
            buf.extend(sample.to_bytes(2,"little",signed=True))
        out.writeframes(buf)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--voice",help="Consent-based exported WAV/MP3/M4A from VoiceStudio")
    p.add_argument("--art-dir",help="Optional original ArtCraft scene-01.png to scene-06.png")
    p.add_argument("--output",default="build/flagship-video/prismbay-30-second-demo.mp4")
    args=p.parse_args()
    assert shutil.which("ffmpeg") and shutil.which("ffprobe"), "Missing FFmpeg or FFprobe"
    target=Path(args.output).resolve()
    target.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="prismbay-video-") as tmp:
        d=Path(tmp)
        for n in range(6):
            dst=d/f"scene-{n+1:02}.png"
            src=Path(args.art_dir)/dst.name if args.art_dir else None
            if src and src.is_file():
                with Image.open(src) as im:
                    im.convert("RGB").resize((1280,720),Image.Resampling.LANCZOS).save(dst)
            else:
                frame(n,dst)
        music=d/"original-score.wav"
        score(music)
        cmd=["ffmpeg","-hide_banner","-loglevel","error","-y"]
        for n in range(6):
            cmd+=["-i",str(d/f"scene-{n+1:02}.png")]
        cmd+=["-i",str(music)]
        if args.voice:
            voice=Path(args.voice).resolve()
            assert voice.exists() and voice.suffix.lower() in {".wav",".mp3",".m4a"}, "Invalid VoiceStudio export"
            cmd+=["-i",str(voice)]
        graph=[]
        for n in range(6):
            graph.append(f"[{n}:v]scale=1344:756,zoompan=z='min(zoom+0.0003,1.05)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=120:s=1280x720:fps=24,setsar=1,fade=t=in:st=0:d=0.2,fade=t=out:st=4.8:d=0.2,format=yuv420p[v{n}]")
        graph.append("".join(f"[v{n}]" for n in range(6))+"concat=n=6:v=1:a=0[v]")
        if args.voice:
            graph.extend(["[6:a]volume=0.2[bed]","[7:a]aresample=16000,atrim=0:30,asetpts=N/SR/TB[voice]","[bed][voice]amix=inputs=2:duration=first:dropout_transition=0[a]"])
        cmd+=["-filter_complex",";".join(graph),"-map","[v]","-map","[a]" if args.voice else "6:a:0",
              "-c:v","libx264","-crf","21","-preset","veryfast","-r","24",
              "-pix_fmt","yuv420p","-c:a","aac","-b:a","160k","-t","30",
              "-movflags","+faststart",str(target)]
        subprocess.run(cmd,check=True)
    print("Video produced:",target)
    print("Publication: blocked. Advertising spend: 0.")

if __name__=="__main__":
    main()
