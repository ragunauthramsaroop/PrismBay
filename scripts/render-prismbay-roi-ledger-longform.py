#!/usr/bin/env python3
"""Original PrismBay AI ROI ledger long-form production. Unpublished QA media only."""
from __future__ import annotations
import hashlib
import json
import math
import re
import subprocess
import sys
import wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"youtube-growth/production/2026-11-01-ai-agent-roi-ledger-longform-master.md"
OUT=ROOT/"out/youtube/ai-agent-roi-ledger-2026-11-01"
WORK=ROOT/".roi-ledger-build"
CHANNEL="UCw2hs85TzIpdKwJtG-BSxzQ"
VOICE="en_US-norman-medium"
VOICE_SHA="b9739443232a80a59c7d18810dd856899bf16a7964725f5ab81ea49b1351cb71"
TEMPO=0.94  # Pitch-preserving 6% slower narration for an 8-12 minute editorial target.
W,H=1920,1080
NAVY=(9,19,34); WHITE=(244,249,255); MUTED=(170,193,211)
CYAN=(69,219,236); GREEN=(120,224,162); GOLD=(251,193,104); RED=(248,117,119)
CHAPTER_TITLES=["THE $18,000 CLAIM","BASELINE COST","STRAIGHT-THROUGH RATE",
                "THE HIDDEN COSTS","PAYBACK MATH","SENSITIVITY",
                "THREE SCORECARDS","CAPACITY VS CASH","THE DECISION RULE"]
SCENE_SUMMARIES=[
 "Automated work does not automatically become cash savings.",
 "Start with measured volume, processing time and loaded cost.",
 "Correct straight-through completion determines exception workload.",
 "Retained human work and operating costs reduce the net benefit.",
 "Payback depends on the monthly economic benefit you verify.",
 "The exception rate changes the economics of the same workflow.",
 "Quality, economics and governance belong in one decision.",
 "Released staff capacity differs from verified cash reductions.",
 "Pilot, measure, verify controls and scale in stages."
]
SCENE_FACTS=[
  ["6,000 INVOICES","$18,000 GROSS COST","GROSS IS NOT NET"],
  ["6,000 INVOICES","5 MIN EACH","500 HOURS","$36 / HOUR","$18,000 / MONTH"],
  ["75% STRAIGHT-THROUGH","1,500 EXCEPTIONS","$4,500 EXCEPTIONS","$2,700 REVIEW"],
  ["$4,500 EXCEPTIONS","$2,700 REVIEW","$5,000 OTHER","$12,200 TOTAL","$5,800 NET"],
  ["$30,000 SETUP","$5,800 / MONTH","5.2 MONTH PAYBACK","$39,600 YEAR 1 NET"],
  ["60%: $3,100 / MONTH","75%: $5,800 / MONTH","90%: $8,500 / MONTH"],
  ["QUALITY","ECONOMICS","GOVERNANCE"],
  ["RELEASED CAPACITY","COST AVOIDANCE","VERIFIED CASH"],
  ["SAMPLE","MEASURE","VERIFY","APPROVE","SCALE IN STAGES"]
]

def run(args):
    print("RUN", " ".join(map(str,args[:9])),flush=True)
    subprocess.run([str(x) for x in args],check=True)

def font(n,bold=False):
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans"+("-Bold" if bold else "")+".ttf",n)

def parse():
    raw=SOURCE.read_text(encoding="utf-8")
    script=raw.split("## Full original narration script",1)[1].split("## On-screen calculations",1)[0]
    sections=re.split(r"(?m)^###\s+",script)[1:]
    assert len(sections)==9, f"Expected 9 chapters, got {len(sections)}"
    chapters=[]
    for section in sections:
        heading,_,body=section.partition("\n")
        body=re.sub(r"\s+"," ",body).strip()
        sentences=re.split(r"(?<=[.!?])\s+(?=[A-Z])",body)
        groups=[]; current=[]
        for sentence in sentences:
            if current and len((" ".join(current)+" "+sentence).split())>40:
                groups.append(" ".join(current));current=[]
            current.append(sentence)
        if current:groups.append(" ".join(current))
        assert all(g.strip() for g in groups)
        chapters.append((heading.split("|",1)[-1].strip(),groups))
    words=sum(len(g.split()) for _,gs in chapters for g in gs)
    assert 1050<=words<=1650,words
    return chapters,words

def fit(draw,text,maxwidth,size=52,minimum=30):
    for n in range(size,minimum-1,-1):
        f=font(n,True)
        words=text.split()
        lines=[];line=""
        for word in words:
            test=(line+" "+word).strip()
            if line and draw.textbbox((0,0),test,font=f)[2]>maxwidth:
                lines.append(line);line=word
            else:line=test
        if line:lines.append(line)
        if len(lines)<=3:return f,lines
    raise ValueError("Text overflow: "+text[:70])

def label(draw,text,x,y,maxwidth=690,size=46,color=WHITE):
    f,lines=fit(draw,text,maxwidth,size)
    draw.multiline_text((x,y),"\n".join(lines),font=f,fill=color,spacing=12)
    return len(lines)*(f.size+13)

def pill(draw,xy,text,color=CYAN):
    draw.rounded_rectangle(xy,radius=22,fill=(25,45,65),outline=color,width=4)
    x1,y1,x2,y2=xy
    f,_=fit(draw,text,x2-x1-55,38,27)
    bbox=draw.textbbox((0,0),text,font=f)
    draw.text((x1+(x2-x1-(bbox[2]-bbox[0]))/2,y1+(y2-y1-(bbox[3]-bbox[1]))/2-6),text,font=f,fill=WHITE)

def diagram(draw,chapter,step):
    x1,x2=1050,1825
    draw.rounded_rectangle((x1,250,x2,875),radius=30,fill=(20,39,59),outline=(49,81,108),width=3)
    draw.text((1090,280),"THE WORKED MODEL",font=font(27,True),fill=CYAN)
    if chapter in (0,1):
        vals=[("6,000", "INVOICES"),("500", "HOURS"),("$18,000","BASELINE")]
        for i,(num,desc) in enumerate(vals):
            y=367+i*150
            draw.text((1105,y),num,font=font(70,True),fill=GOLD if i==2 else CYAN)
            draw.text((1480,y+25),desc,font=font(29,True),fill=WHITE)
    elif chapter in (2,3):
        rows=[("BASELINE","$18,000",CYAN),("EXCEPTIONS","$4,500",GOLD),("REVIEW","$2,700",GOLD),
              ("OTHER","$5,000",GOLD),("NET BENEFIT","$5,800",GREEN)]
        for i,(name,val,col) in enumerate(rows):
            y=365+i*96
            draw.text((1085,y),name,font=font(27,True),fill=MUTED)
            draw.text((1520,y),val,font=font(39,True),fill=col)
    elif chapter==4:
        for i,(name,val) in enumerate([("SETUP","$30,000"),("MONTHLY NET","$5,800"),("PAYBACK","5.2 MONTHS")]):
            y=385+i*140
            draw.text((1100,y),name,font=font(31,True),fill=MUTED)
            draw.text((1100,y+40),val,font=font(63,True),fill=GREEN if i==2 else CYAN)
    elif chapter==5:
        for i,(pct,benefit,col) in enumerate([(60,3100,RED),(75,5800,GOLD),(90,8500,GREEN)]):
            y=385+i*143
            draw.text((1090,y),str(pct)+"%",font=font(40,True),fill=col)
            draw.rounded_rectangle((1210,y+3,1740,y+54),radius=17,fill=(41,62,80))
            draw.rounded_rectangle((1210,y+3,1210+int(530*benefit/8500),y+54),radius=17,fill=col)
            draw.text((1470,y+65),"$"+format(benefit,","),font=font(35,True),fill=WHITE)
    elif chapter==6:
        for i,(name,col) in enumerate([("QUALITY",CYAN),("ECONOMICS",GOLD),("GOVERNANCE",GREEN)]):
            pill(draw,(1100,370+i*158,1770,483+i*158),name,col)
    elif chapter==7:
        for i,(name,col) in enumerate([("CAPACITY",CYAN),("AVOIDED COST",GOLD),("CASH SAVINGS",GREEN)]):
            pill(draw,(1100,370+i*158,1770,483+i*158),name,col)
    else:
        for i,(name,col) in enumerate([("PILOT",CYAN),("MEASURE",GOLD),("CONTROL",GREEN),("SCALE",CYAN)]):
            pill(draw,(1120,354+i*120,1760,444+i*120),name,col)

def frame(chapter,scene_index,heading,narration,out):
    img=Image.new("RGB",(W,H),NAVY);d=ImageDraw.Draw(img)
    for y in range(0,H,70):d.line((0,y,W,y),fill=(15,31,48),width=1)
    d.rectangle((0,0,W,16),fill=CYAN)
    d.text((85,52),"PRISMBAY AI  /  AI SYSTEMS, MEASURED",font=font(34,True),fill=CYAN)
    d.text((86,119),"ORIGINAL CFO-LEVEL ROI MODEL  |  ILLUSTRATIVE USD",font=font(24,True),fill=MUTED)
    d.line((86,194,1830,194),fill=(51,78,101),width=3)
    d.text((86,242),f"{chapter+1:02d}  {CHAPTER_TITLES[chapter]}",font=font(47,True),fill=GOLD)
    sentence=re.split(r"(?<=[.!?])\s+",narration)[0]
    if len(sentence)>112:sentence=SCENE_SUMMARIES[chapter]
    label(d,sentence,90,367,maxwidth=875,size=49)
    diagram(d,chapter,scene_index)
    facts=SCENE_FACTS[chapter]
    fact=facts[scene_index%len(facts)]
    d.rounded_rectangle((88,720,973,869),radius=26,fill=(23,48,64),outline=CYAN,width=3)
    label(d,fact,122,761,maxwidth=800,size=53,color=GREEN)
    d.line((87,939,1830,939),fill=(53,82,104),width=2)
    d.text((88,978),"ALL FIGURES HYPOTHETICAL. CAPACITY IS NOT CASH.",font=font(27,True),fill=MUTED)
    img.save(out,optimize=True)

def thumbnail(kind,out):
    im=Image.new("RGB",(1280,720),NAVY);d=ImageDraw.Draw(im)
    d.text((54,40),"PRISMBAY AI",font=font(35,True),fill=CYAN)
    if kind=="A":
        d.text((65,185),"$18,000",font=font(126,True),fill=GOLD)
        d.line((60,302,850,302),fill=RED,width=17)
        d.text((75,350),"$5,800",font=font(138,True),fill=GREEN)
        d.text((72,578),"REAL SAVINGS?",font=font(53,True),fill=WHITE)
    elif kind=="B":
        d.text((75,170),"5 NUMBERS",font=font(116,True),fill=CYAN)
        d.text((75,345),"BEFORE",font=font(100,True),fill=WHITE)
        d.text((75,472),"YOU BUY",font=font(100,True),fill=GOLD)
    else:
        d.text((65,165),"AI AGENT",font=font(100,True),fill=WHITE)
        d.text((65,290),"PAYBACK",font=font(111,True),fill=CYAN)
        d.text((65,430),"5.2 MONTHS",font=font(88,True),fill=GREEN)
        d.text((65,580),"ILLUSTRATIVE",font=font(30,True),fill=MUTED)
    im.save(out,optimize=True)

def duration(wav):
    with wave.open(str(wav),"rb") as f:return f.getnframes()/f.getframerate()

def stamp(seconds):
    ms=round(seconds*1000)
    h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def main():
    chapters,words=parse()
    OUT.mkdir(parents=True,exist_ok=True)
    WORK.mkdir(parents=True,exist_ok=True)
    voices=WORK/"voices";voices.mkdir(exist_ok=True)
    run([sys.executable,"-m","piper.download_voices","--data-dir",voices,VOICE])
    model=voices/(VOICE+".onnx")
    assert model.is_file() and hashlib.sha256(model.read_bytes()).hexdigest()==VOICE_SHA,"Voice provenance mismatch"
    playlist=[];captions=[];chapter_meta=[];t=0.0;counter=0
    for ci,(title,groups) in enumerate(chapters):
        chapter_meta.append({"chapter":title,"startSeconds":round(t,2)})
        for si,spoken in enumerate(groups):
            wav=WORK/f"voice_{counter:03d}.wav"
            png=WORK/f"frame_{counter:03d}.png"
            clip=WORK/f"clip_{counter:03d}.mp4"
            run([sys.executable,"-m","piper","-m",VOICE,"--data-dir",voices,"-f",wav,"--",spoken])
            sec=duration(wav)/TEMPO+0.15
            frame(ci,si,title,spoken,png)
            run(["ffmpeg","-hide_banner","-loglevel","error","-y","-loop","1","-framerate","24","-i",png,
                 "-i",wav,"-t",f"{sec:.3f}","-vf","format=yuv420p","-c:v","libx264",
                 "-preset","ultrafast","-crf","24","-r","24","-c:a","aac","-b:a","128k",
                 "-af",f"atempo={TEMPO},apad=pad_dur=0.15,volume=-3dB","-movflags","+faststart",clip])
            playlist.append(clip)
            captions.append((t,t+sec,spoken))
            t+=sec;counter+=1
    concat=WORK/"concat.txt"
    concat.write_text("".join("file '"+str(p.resolve())+"'\n" for p in playlist))
    video=OUT/"prismbay-ai-agent-roi-ledger-unapproved.mp4"
    run(["ffmpeg","-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",concat,
         "-c","copy","-movflags","+faststart",video])
    info=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_format","-show_streams","-of","json",video],text=True))
    actual=float(info["format"]["duration"])
    assert 400<=actual<=1000,f"Unexpected runtime {actual}"
    assert any(s.get("width")==1920 and s.get("height")==1080 for s in info["streams"])
    assert any(s.get("codec_name")=="aac" for s in info["streams"])
    (OUT/"captions-provisional.srt").write_text("".join(f"{i}\n{stamp(a)} --> {stamp(b)}\n{line}\n\n" for i,(a,b,line) in enumerate(captions,1)))
    for variant in "ABC":thumbnail(variant,OUT/f"thumbnail_{variant}.png")
    manifest={
      "channelId":CHANNEL,"handle":"@PrismBayAI","experimentId":"PB-YT-LF-2026-11-01-ROI-LEDGER",
      "published":False,"publicationApproved":False,"uploadPermitted":False,"paidSpendUSD":0,
      "videoSha256":hashlib.sha256(video.read_bytes()).hexdigest(),
      "sourceSha256":hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
      "voiceModelSha256":VOICE_SHA,"voiceProvenanceVerified":True,"narrationTempo":TEMPO,
      "durationSeconds":round(actual,3),"wordCount":words,"sceneCount":counter,
      "chapterStarts":chapter_meta,"thumbnailVariants":["A","B","C"],
      "captionStatus":"PROVISIONAL_NOT_SPEECH_ALIGNED",
      "humanNarrationReview":"PENDING","physicalMobilePlayback":"PENDING",
      "visualEditorialReview":"PENDING","nativeABTest":"NOT_STARTED",
      "sourceNumbers":"ILLUSTRATIVE_NOT_REALIZED_CASH",
      "status":"PRIVATE_PRODUCTION_ARTIFACT_ONLY"
    }
    (OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps({"runtimeSeconds":actual,"scenes":counter,"words":words,"published":False}))
if __name__=="__main__":main()
