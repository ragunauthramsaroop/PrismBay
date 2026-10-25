#!/usr/bin/env python3
"""Fail-closed exact-SKU live-action crevice brush editor. No source == no product video.
Rights are reviewed independently. Never publishes or asserts stock/shipping.
"""
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import wave
import io
from PIL import Image, ImageChops, ImageStat
ROOT=Path(__file__).resolve().parents[1]
RIGHTS=ROOT/"marketing/tiktok/owned-footage/crevice-brush-usage-rights.json"
OUT=ROOT/"build/tiktok-repairs/crevice-brush"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
CAPTIONS=[
  "DIRT IN THE TINY GAPS?",
  "WATCH THE BRISTLES WORK",
  "GET INTO NARROW CORNERS",
  "SEE THE RESULT IN ONE SHOT"
]
def cmd(args):
    p=subprocess.run(args,capture_output=True,check=False)
    if p.returncode:raise RuntimeError("command_failed "+p.stderr[-1500:].decode(errors="replace"))
    return p.stdout

def get_frame(file,time_seconds):
    raw=cmd(["ffmpeg","-v","error","-ss",str(time_seconds),"-i",str(file),"-frames:v","1",
             "-vf","scale=160:284","-f","image2pipe","-vcodec","png","-"])
    return Image.open(io.BytesIO(raw)).convert("RGB")

def inspect_motion(file,duration):
    checkpoints=[(0.8,1.7),(4.5,5.4),(8.0,8.9),(11.7,12.6)]
    if duration<15:raise ValueError("source_duration_insufficient_15_seconds")
    result=[]
    for t,u in checkpoints:
        diff=ImageChops.difference(get_frame(file,t),get_frame(file,u))
        amount=sum(ImageStat.Stat(diff).mean)/3
        result.append(round(amount,2))
    if sum(x>2.2 for x in result)<3:raise ValueError("source_fails_genuine_live_motion_gate")
    return result

def music(out,sec=18,rate=22050):
    with wave.open(str(out),"wb") as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        samples=array.array("h")
        for i in range(rate*sec):
            t=i/rate;b=(t*2)%1
            v=.07*math.sin(2*math.pi*(55+60*math.exp(-b*28))*t)*math.exp(-b*18)
            v+=.018*math.sin(2*math.pi*196*t)*math.exp(-b*12)
            v*=max(0,min(1,t/.4,(sec-t)/.3))
            samples.append(int(max(-1,min(1,v))*32767))
        f.writeframes(samples.tobytes())

def plan():
    rights=json.loads(RIGHTS.read_text())
    src=(ROOT/rights["footageSource"]).resolve()
    inside=ROOT.resolve() in src.parents
    approved=all([rights.get("exactSku")=="legacy-crevice-brush-001",inside,
                  rights.get("rightsAuthorized") is True,
                  rights.get("exactSkuVisualMatchVerified") is True,
                  rights.get("commercialAdRights") is True,
                  rights.get("derivativeVideoRights") is True,
                  isinstance(rights.get("rightsEvidenceUrl"),str) and rights["rightsEvidenceUrl"].startswith("https://"),
                  isinstance(rights.get("provenanceReviewer"),str) and len(rights["provenanceReviewer"])>3,
                  src.is_file()])
    return rights,src,approved

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    rights,source,approved=plan()
    manifest={
      "schemaVersion":1,"status":"blocked_missing_licensed_exact_sku_footage",
      "sku":"legacy-crevice-brush-001","outputVideo":None,"published":False,
      "rightsVerified":approved,"sourceProvided":source.is_file(),
      "note":"A filmed exact-SKU demonstration is mandatory. Do not substitute product image/stock/synthetic action.",
      "storyboard":CAPTIONS}
    if not approved:
        (OUT/"report.json").write_text(json.dumps(manifest,indent=2)+"\n")
        print(json.dumps(manifest))
        return
    probe=json.loads(cmd(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(source)]))
    duration=float(probe["format"]["duration"])
    video=next((x for x in probe["streams"] if x.get("codec_type")=="video"),{})
    if min(int(video.get("width") or 0),int(video.get("height") or 0))<480:
        raise ValueError("source_video_below_minimum_resolution")
    motion=inspect_motion(source,duration)
    mp3=OUT/"original-music.wav"
    music(mp3)
    # Four filmed action moments. Single original source timeline; no fabricated before/after.
    captionfiles=[]
    for i,c in enumerate(CAPTIONS):
        f=OUT/("caption-"+str(i)+".txt");f.write_text(c);captionfiles.append(f)
    sourceInputs=[]
    parts=[]
    for i,(start,secs) in enumerate([(0,3.9),(4.0,3.9),(8.0,3.9),(12,3.9)]):
        sourceInputs+=["-ss",str(start),"-t",str(secs),"-i",str(source)]
        parts.append(
          "["+str(i)+":v]scale=1080:1920:force_original_aspect_ratio=increase,"
          "crop=1080:1920,setsar=1,fps=30,eq=contrast=1.04:saturation=1.05,"
          "drawbox=x=0:y=0:w=1080:h=290:color=black@0.35:t=fill,"
          "drawbox=x=0:y=1685:w=1080:h=235:color=black@0.40:t=fill,"
          "drawtext=fontfile="+FONT+":textfile="+str(captionfiles[i])+":"
          "expansion=none:fontsize=52:fontcolor=white:x=70:y=172,"
          "format=yuv420p,setpts=PTS-STARTPTS[v"+str(i)+"]")
    parts.append("".join("[v"+str(i)+"]" for i in range(4))+"concat=n=4:v=1:a=0[v]")
    dest=OUT/"crevice-brush-exact-sku-film-review.mp4"
    cmd(["ffmpeg","-hide_banner","-loglevel","error","-y",*sourceInputs,"-i",str(mp3),
         "-filter_complex",";".join(parts),"-map","[v]","-map","4:a",
         "-c:v","libx264","-preset","veryfast","-crf","22","-pix_fmt","yuv420p",
         "-c:a","aac","-b:a","96k","-movflags","+faststart","-t","15.6",str(dest)])
    quality=json.loads(cmd(["ffprobe","-v","error","-show_format","-show_streams","-of","json",str(dest)]))
    stream=next((x for x in quality["streams"] if x.get("codec_type")=="video"),{})
    if stream.get("width")!=1080 or stream.get("height")!=1920 or
      not 15<=float(quality["format"]["duration"])<=16.5:
        raise ValueError("render_not_usable")
    manifest.update(status="rendered_editorial_draft_only",outputVideo=dest.name,
      sourceMotionScores=motion,sha256=hashlib.sha256(dest.read_bytes()).hexdigest())
    (OUT/"report.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps(manifest))
if __name__=="__main__":main()
