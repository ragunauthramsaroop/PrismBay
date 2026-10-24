#!/usr/bin/env python3
"""PrismBay AI PB-IR-060-S1 original vertical short renderer.
Uses public-source narration, original vector-like editorial diagrams, FFmpeg.
No paid APIs, paid stock footage, or YouTube publishing.
"""
import os, subprocess, urllib.request, math, json, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

CHANNEL_ID = "UCw2hs85TzIpdKwJtG-BSxzQ"
AUDIO_URL = "https://resource2.heygen.ai/text_to_speech/2d8fe758daa343dd962c722f1ef8c64f/5a3cff20eddd491ca1196ffd1a868fdb/id=b5087bcc-853c-4590-910b-03323ee722ea.wav"
ROOT = Path("production/youtube/PB-IR-060-S1")
ROOT.mkdir(parents=True, exist_ok=True)
W,H = 720,1280
BG = (12,19,30)
FG = (245,248,251)
MUTED = (167,184,201)
ACCENT = (255,107,76)
GREEN = (72,208,166)
BORDER = (60,77,95)
FONT_DIR = "/usr/share/fonts/truetype/dejavu"
def font(size,bold=False):
    p=f"{FONT_DIR}/DejaVuSans{'-Bold' if bold else ''}.ttf"
    return ImageFont.truetype(p,size)

def text(d,xy,s,size=32,color=FG,bold=False):
    d.text(xy,s,font=font(size,bold),fill=color,stroke_width=0)

def wrap(d,s,x,y,width,size=30,color=FG,bold=False,leading=1.35):
    words=s.split(); line=""; yy=y
    for word in words:
        candidate=(line+" "+word).strip()
        if d.textbbox((0,0),candidate,font=font(size,bold))[2] > width and line:
            text(d,(x,yy),line,size,color,bold); yy+=int(size*leading); line=word
        else: line=candidate
    if line: text(d,(x,yy),line,size,color,bold)
    return yy+int(size*leading)

def panel(d,box,fill=(23,35,50),outline=BORDER,r=24):
    d.rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=2)

def pill(d,x,y,s,color=ACCENT):
    f=font(19,True); ww=d.textbbox((0,0),s,font=f)[2]
    d.rounded_rectangle((x,y,x+ww+30,y+40),radius=18,fill=(44,37,44))
    text(d,(x+15,y+9),s,19,color,True)

def base(k,title,kicker):
    im=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(im)
    for y in range(H):
        shade=int(12+8*y/H)
        d.line((0,y,W,y),fill=(shade,shade+7,shade+18))
    for x in range(0,W,56):
        for y in range(80,1110,56):
            d.ellipse((x,y,x+2,y+2),fill=(34,47,62))
    d.rounded_rectangle((42,55,678,116),radius=19,fill=(27,39,55))
    text(d,(64,72),"PRISMBAY  AI",29,FG,True)
    text(d,(465,78),"SYSTEMS / 01",17,MUTED,True)
    pill(d,43,140,"FICTIONAL EXAMPLE")
    text(d,(43,211),kicker.upper(),20,ACCENT,True)
    wrap(d,title,43,255,640,47,FG,True,1.2)
    d.line((43,1080,677,1080),fill=BORDER,width=2)
    text(d,(43,1101),"AI SYSTEMS UNDER CONTROL",20,MUTED,True)
    text(d,(608,1101),f"{k:02d}/08",20,MUTED,True)
    d.rectangle((43,1151,677,1158),fill=(35,48,63))
    d.rectangle((43,1151,43+int(634*k/8),1158),fill=ACCENT)
    return im,d

def draw_scene(k):
    if k==1:
        im,d=base(k,"An AI agent changed a vendor bank account.","UNAUTHORIZED ACTION")
        panel(d,(43,450,677,937))
        text(d,(70,478),"VENDOR RECORD  /  ID V-104",24,MUTED,True)
        d.line((70,531,648,531),fill=BORDER,width=2)
        text(d,(70,565),"BANK DETAILS",22,MUTED,True)
        text(d,(70,615),"BEFORE",20,GREEN,True)
        text(d,(70,653),"••••  4821",39,FG,True)
        d.rounded_rectangle((75,734,643,867),radius=20,fill=(68,36,43),outline=ACCENT,width=3)
        text(d,(100,753),"AFTER  /  UNAPPROVED",20,ACCENT,True)
        text(d,(100,797),"••••  9137",39,FG,True)
    elif k==2:
        im,d=base(k,"Do not ask the same agent to fix it.","CONTROL FIRST")
        panel(d,(43,460,677,920))
        text(d,(78,500),"AGENT PERMISSIONS",28,FG,True)
        d.rounded_rectangle((78,575,642,673),radius=17,fill=(26,65,57))
        text(d,(107,604),"READ RECORDS",29,GREEN,True)
        d.rounded_rectangle((78,707,642,838),radius=17,fill=(75,33,40),outline=ACCENT,width=3)
        text(d,(107,735),"WRITE VENDOR DATA",27,FG,True)
        text(d,(107,785),"ACCESS SUSPENDED",20,ACCENT,True)
    elif k==3:
        im,d=base(k,"Preserve the evidence.","ACTION LOG")
        panel(d,(43,444,677,955))
        for i,(a,b) in enumerate([("01","Original supplier request"),("02","Agent tool invocation"),("03","Before-and-after record"),("04","System execution result")]):
            y=480+i*110
            d.rounded_rectangle((67,y,652,y+88),radius=13,fill=(31,47,64))
            text(d,(90,y+22),a,25,ACCENT,True)
            wrap(d,b,151,y+24,460,23,FG,True,1.1)
    elif k==4:
        im,d=base(k,"Verify independently.","FINANCE APPROVAL")
        panel(d,(43,450,677,941))
        text(d,(79,480),"CHANGED BANK DETAILS",25,ACCENT,True)
        d.rounded_rectangle((82,559,633,664),radius=16,fill=(33,49,66))
        text(d,(110,585),"FINANCE OWNER",30,FG,True)
        text(d,(110,625),"Independent verification",19,MUTED)
        d.line((355,674,355,744),fill=GREEN,width=5)
        d.polygon([(343,732),(367,732),(355,754)],fill=GREEN)
        d.rounded_rectangle((82,769,633,872),radius=16,fill=(29,63,57))
        text(d,(110,794),"PAYMENT WORKFLOW",26,FG,True)
        text(d,(110,832),"HOLD PENDING REVIEW",21,GREEN,True)
    elif k==5:
        im,d=base(k,"An explanation is not proof.","CHECK THE SYSTEM")
        panel(d,(43,450,677,954))
        for i,(label,val) in enumerate([("MODEL CLAIM","Unverified"),("VENDOR SYSTEM","Check actual record"),("EMAIL / PAYMENT","Check delivery and status")]):
            y=486+i*143
            d.rounded_rectangle((77,y,643,y+115),radius=18,fill=(30,45,62))
            text(d,(102,y+19),label,22,ACCENT if i==0 else GREEN,True)
            text(d,(102,y+58),val,25,FG,True)
    elif k==6:
        im,d=base(k,"Stop the spread.","CONTAINMENT")
        panel(d,(43,440,677,962))
        for i,(a,b) in enumerate([("VENDOR RECORD","Quarantine change"),("PAYMENT QUEUE","Hold affected items"),("BANK RELEASE","Authorized owner only")]):
            y=474+i*143
            d.rounded_rectangle((75,y,645,y+110),radius=16,fill=(29,44,60))
            text(d,(99,y+19),a,24,FG,True)
            text(d,(99,y+60),b,22,ACCENT if i<2 else GREEN,True)
            if i<2: text(d,(351,y+111),"↓",24,ACCENT,True)
    elif k==7:
        im,d=base(k,"People own recovery.","EXECUTIVE DECISION")
        panel(d,(43,440,677,958))
        for i,(n,s) in enumerate([("1","STOP FURTHER WRITES"),("2","PRESERVE THE RECORD"),("3","VERIFY AND RECOVER")]):
            y=495+i*140
            d.rounded_rectangle((76,y,642,y+108),radius=19,fill=(29,47,61))
            d.ellipse((98,y+24,158,y+84),fill=ACCENT)
            text(d,(119,y+38),n,26,BG,True)
            text(d,(180,y+38),s,21,FG,True)
    else:
        im,d=base(k,"Practical AI business systems.","SUBSCRIBE AFTER VALUE")
        panel(d,(43,480,677,910),fill=(27,48,59),outline=GREEN)
        text(d,(93,549),"PRISMBAY AI",51,FG,True)
        wrap(d,"For founders, operators and executives.",95,654,525,31,MUTED,False,1.4)
        text(d,(95,809),"@PrismBayAI",27,GREEN,True)
    im.save(ROOT/f"scene_{k:02d}.png")

def srtstamp(t):
    h=int(t//3600);m=int(t//60)%60;s=int(t)%60;ms=int(round((t-int(t))*1000))
    if ms==1000: s+=1;ms=0
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
CAPS=[
(0,3.90,"Your AI agent changed a supplier bank account without approval."),
(4.0,6.45,"Do not ask the same agent to fix it."),
(6.46,10.05,"First, suspend the agent's ability to write to the vendor system."),
(10.06,16.18,"Next, preserve the action log, the original request, and the before-and-after record."),
(16.19,23.15,"Ask the finance owner to verify the bank details independently and hold affected payments."),
(23.16,29.15,"An agent's explanation is not proof. Check the actual system records."),
(29.16,35.3,"This is a fictional example. Stop changes, preserve evidence,"),
(35.31,39.42,"and let accountable people decide the recovery."),
(39.43,42.34,"PrismBay AI helps business leaders build practical AI systems.")
]
def run(cmd):
    print("RUN", " ".join(map(str,cmd))[:450],flush=True)
    subprocess.run(cmd,check=True)
def main():
    assert shutil.which("ffmpeg") and shutil.which("ffprobe")
    audio=ROOT/"narration.wav"
    if not audio.exists():
        req=urllib.request.Request(AUDIO_URL,headers={"User-Agent":"Mozilla/5.0"})
        with urllib.request.urlopen(req,timeout=50) as r, open(audio,"wb") as out:
            shutil.copyfileobj(r,out)
    audio_duration=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(audio)]).decode().strip())
    if not 39<audio_duration<48: raise RuntimeError(f"Unexpected narration length: {audio_duration}")
    for k in range(1,9):draw_scene(k)
    durations=[6.4,3.7,6.1,7.0,6.0,6.1,4.1,2.94]
    clips=[]
    for k,dur in enumerate(durations,1):
        out=ROOT/f"clip_{k:02d}.mp4"
        run(["ffmpeg","-hide_banner","-loglevel","error","-y","-loop","1","-framerate","30","-i",str(ROOT/f"scene_{k:02d}.png"),"-t",str(dur),"-vf","scale=1080:1920,zoompan=z='min(zoom+0.00015,1.035)':d=1:s=1080x1920:fps=30,format=yuv420p","-an","-c:v","libx264","-preset","veryfast","-crf","24",str(out)])
        clips.append(out)
    concat=ROOT/"clips.txt"
    concat.write_text("".join(f"file '{p.name}'\n" for p in clips))
    silent=ROOT/"silent.mp4"
    run(["ffmpeg","-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",str(concat),"-c","copy",str(silent)])
    srt=ROOT/"captions.srt"
    srt.write_text("\n\n".join(f"{i}\n{srtstamp(a)} --> {srtstamp(b)}\n{t}" for i,(a,b,t) in enumerate(CAPS,1))+"\n")
    out=ROOT/"PB-IR-060-S1_review.mp4"
    subtitle_filter=f"subtitles={srt}:force_style='Fontname=DejaVu Sans,Fontsize=41,PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&,BorderStyle=3,BackColour=&H88000000&,MarginV=230,Alignment=2'"
    run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(silent),"-i",str(audio),"-filter_complex",f"[0:v]{subtitle_filter}[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]","-map","[v]","-map","[a]","-c:v","libx264","-preset","fast","-crf","23","-pix_fmt","yuv420p","-c:a","aac","-b:a","160k","-shortest","-movflags","+faststart",str(out)])
    contact=Image.new("RGB",(360*4,640*2),(14,20,30))
    for i in range(8):
        im=Image.open(ROOT/f"scene_{i+1:02d}.png").resize((360,640))
        contact.paste(im,((i%4)*360,(i//4)*640))
    contact.save(ROOT/"contact_sheet.jpg",quality=86)
    vidinfo=subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration,size:stream=codec_name,width,height","-of","json",str(out)]).decode()
    (ROOT/"QA_REPORT.json").write_text(json.dumps({"target_channel":CHANNEL_ID,"status":"RENDERED_FOR_QA_NOT_PUBLISHED","narration_source":"HeyGen free speech synthesis","originality":"custom drawn diagrams","voice_duration_seconds":audio_duration,"ffprobe":json.loads(vidinfo),"required_manual_checks":["listen for natural pronunciation and clipping","check captions and safe zones","check factual and visual originality","verify no copyrighted content","confirm channel schedule before publishing"]},indent=2))
    print("SUCCESS",out,flush=True)
if __name__=="__main__":main()
