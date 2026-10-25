#!/usr/bin/env python3
"""PrismBay film-first TikTok creative studio. GitHub Actions-only; NEVER posts.

Every shot must contain real, licensed live-action video. No static images,
product-card screenshots, synthetic testimonials or unverified SKU demonstrations.
Stock scenes are identified as illustrative lifestyle footage, not our SKU.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import urllib.request
import urllib.error
import wave
import array
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageStat

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"build"/"retail-film-studio"
W,H,FPS=1080,1920,30
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SRC={
 "bathroom": {
   "title":"BATHROOM CLEANING",
   "description":"Genuine human cleaning bathroom surface; not the PrismBay electric scrubber",
   "sourcePage":"https://mixkit.co/free-stock-video/man-with-face-mask-cleaning-the-surface-of-a-bathroom-5319/",
   "licensePage":"https://mixkit.co/license/modal/videoFree/",
   "license":"Mixkit Stock Video Free License / commercial social ads permitted",
   "candidates":[
     "https://assets.mixkit.co/videos/preview/mixkit-man-with-face-mask-cleaning-the-surface-of-a-bathroom-5319-large.mp4",
     "https://assets.mixkit.co/videos/preview/mixkit-man-with-face-mask-cleaning-the-surface-of-a-bathroom-5319-small.mp4",
   ],
   "hooks":["Still scrubbing by hand?","Cleaning the little corners.","Real homes. Real chores.","Explore better cleaning tools."],
   "card":"PRISMBAY CLEAN  /  BATHROOM TOOLS",
   "url":"https://clean.prismbayai.com/",
   "disclosure":"ILLUSTRATIVE LIFESTYLE FOOTAGE • NOT A PRODUCT DEMO",
 },
 "garments": {
   "title":"GARMENT CARE",
   "description":"Real person steaming apparel with an unspecified handheld steamer, not our SKU",
   "sourcePage":"https://www.pexels.com/video/a-person-using-a-steamer-on-a-white-t-shirt-10558368/",
   "licensePage":"https://www.pexels.com/legal-pages/license/",
   "license":"Pexels License / free commercial use / people shown do not endorse PrismBay",
   "candidates":[
     "https://videos.pexels.com/video-files/10558368/10558368-hd_1080_1920_25fps.mp4",
     "https://videos.pexels.com/video-files/10558368/10558368-hd_1920_1080_25fps.mp4",
     "https://videos.pexels.com/video-files/10558368/10558368-hd_1080_1920_30fps.mp4",
     "https://videos.pexels.com/video-files/10558368/10558368-hd_1920_1080_30fps.mp4",
     "https://videos.pexels.com/video-files/10558368/10558368-sd_540_960_25fps.mp4",
   ],
   "hooks":["Got five minutes to get ready?","Refresh your wardrobe routine.","Steaming in real life.","Explore portable garment care."],
   "card":"PRISMBAY CLEAN  /  GARMENT CARE",
   "url":"https://clean.prismbayai.com/",
   "disclosure":"ILLUSTRATIVE LIFESTYLE FOOTAGE • NOT OUR EXACT DEVICE",
 }
}
def command(args,check=True):
    p=subprocess.run(args,capture_output=True,text=True)
    if check and p.returncode:
        raise RuntimeError("command_failed: "+" ".join(args[:4])+" / "+p.stderr[-1200:])
    return p

def ffprobe(path):
    p=command(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(path)])
    return json.loads(p.stdout)

def validate_sources():
    assert len(SRC)==2
    for name,s in SRC.items():
        assert all(len(x)<=48 for x in s["hooks"])
        assert len(s["hooks"])==4
        assert "NOT" in s["disclosure"]
        assert s["url"].startswith("https://clean.prismbayai.com/")
        assert s["sourcePage"].startswith(("https://mixkit.co/","https://www.pexels.com/"))
        assert s["licensePage"].startswith(("https://mixkit.co/","https://www.pexels.com/"))
        for u in s["candidates"]:
            assert u.startswith(("https://assets.mixkit.co/videos/","https://videos.pexels.com/video-files/"))
            assert u.endswith(".mp4")
    return True

def get_video(url,out):
    request=urllib.request.Request(url,headers={"User-Agent":"PrismBay Creative Studio/1.0 (rights-verified video probe)",
                                                  "Accept":"video/mp4,application/octet-stream;q=0.8"})
    with urllib.request.urlopen(request,timeout=25) as resp:
        actual=resp.geturl()
        if not actual.startswith(("https://assets.mixkit.co/videos/","https://videos.pexels.com/video-files/")):
            raise ValueError("source_redirected_to_unapproved_host")
        typ=resp.headers.get("content-type","").lower()
        if not ("video/" in typ or "octet-stream" in typ):
            raise ValueError("unexpected_media_type_"+typ)
        size=0
        with open(out,"wb") as f:
            while True:
                data=resp.read(128*1024)
                if not data:break
                size+=len(data)
                if size>90_000_000:raise ValueError("media_exceeds_90mb")
                f.write(data)
        if size<300000:raise ValueError("suspiciously_short_video")
        return {"uri":url,"redirectedUrl":actual,"bytes":size,"sha256":hashlib.sha256(out.read_bytes()).hexdigest()}

def motion_score(file):
    # Screen *differences* from real decoded footage, not fake animation overlays.
    p=ffprobe(file)
    v=next((x for x in p.get("streams",[]) if x.get("codec_type")=="video"),{})
    duration=float(p.get("format",{}).get("duration",0))
    if not 13<=duration<=120 or int(v.get("width",0))<640 or int(v.get("height",0))<360:
        raise ValueError("source_video_duration_or_resolution_invalid")
    images=[]
    for sec in [2,4,7,10]:
        raw=command(["ffmpeg","-v","error","-ss",str(sec),"-i",str(file),
                     "-frames:v","1","-vf","scale=192:108","-f","image2pipe","-vcodec","mjpeg","-"]).stdout
        # subprocess text mode not suitable for image pipes; write an actual thumbnail instead.
    return duration

def assert_footage_motion(video,target):
    # Multiple moments, separated by <1s, must contain image differences.
    scores=[]
    for t in [1.2,4.2,8.2]:
        captures=[]
        for step,sec in enumerate([t,t+0.8]):
            f=target/("motion-"+str(len(scores))+"-"+str(step)+".png")
            command(["ffmpeg","-v","error","-y","-ss",str(sec),"-i",str(video),
                     "-frames:v","1","-vf","scale=160:284",str(f)])
            captures.append(Image.open(f).convert("RGB"))
        diff=ImageChops.difference(*captures)
        scores.append(sum(ImageStat.Stat(diff).mean)/3)
    if max(scores)<0.85:
        raise ValueError("reject_static_source_video: "+str(scores))
    return scores

def acquire(name,spec,folder):
    folder.mkdir(parents=True,exist_ok=True)
    dest=folder/(name+".mp4");errors=[]
    for url in spec["candidates"]:
        try:
            desc=get_video(url,dest)
            duration=float(ffprobe(dest)["format"]["duration"])
            score=assert_footage_motion(dest,folder)
            if duration<14:raise ValueError("clip_duration_below_14_seconds")
            return {**desc,"duration":duration,"motionDifferences":score,
                    "licensePage":spec["licensePage"],"sourcePage":spec["sourcePage"],
                    "filmedScene":spec["description"],"isExactProductDemo":False}
        except Exception as ex:
            errors.append({"candidate":url.split("/")[-1],"reason":str(ex)[:140]})
            if dest.exists():dest.unlink()
    raise RuntimeError("No license-curated video download passed: "+name+"; "+json.dumps(errors))

def soundtrack(out,seconds=18,rate=22050):
    # Original programmatically synthesized music, not copied audio from stock/media.
    with wave.open(str(out),"wb") as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        samples=array.array("h")
        for i in range(rate*seconds):
            t=i/rate;beat=(t*2.3)%1
            kick=math.sin(2*math.pi*(55+48*math.exp(-beat*28))*t)*math.exp(-beat*24)
            pulse=math.sin(2*math.pi*(196 if int(t*2.3)%4<2 else 246.94)*t)*math.exp(-beat*15)
            envelope=min(1,t/.3,max(0,(seconds-t)/.5))
            samples.append(int(max(-1,min(1,(kick*.1+pulse*.015)*envelope))*32767))
        f.writeframes(samples.tobytes())

def render(name,spec,source,audio,out):
    output=out/(name+"-professional-draft.mp4")
    # A true film edit: 4 distinct moments from real motion footage; NO still image takes.
    timings=[(0,4.0),(4.3,4.0),(8.6,4.0),(12.8,3.5)]
    times=sum(x[1] for x in timings)
    filters=[];inputs=[];headline_files=[]
    for i,((st,duration),hook) in enumerate(zip(timings,spec["hooks"])):
        f=out/(name+"-headline-"+str(i)+".txt");f.write_text(hook)
        headline_files.append(f)
        inputs+=["-ss",str(st),"-t",str(duration),"-i",str(source)]
        center=[.36,.48,.6,.5][i]
        # Real full-frame film action; mild cinematic grade, minimal text, safe-zone disclosure.
        filters.append(
           "["+str(i)+":v]scale=1080:1920:force_original_aspect_ratio=increase,"
           "crop=1080:1920:(in_w-out_w)*"+str(center)+":(in_h-out_h)/2,"
           "setsar=1,fps=30,"
           "eq=contrast=1.06:saturation=1.05,"
           "drawbox=x=0:y=0:w=1080:h=390:color=black@0.38:t=fill,"
           "drawbox=x=0:y=1660:w=1080:h=260:color=black@0.48:t=fill,"
           "drawtext=fontfile="+FONT+":textfile="+str(f)+":fontsize=52:"
           "fontcolor=white:x=65:y=185:expansion=none:"
           "box=0,"
           "drawtext=fontfile="+FONT+":textfile="+str(out/(name+"-disclosure.txt"))+":"
           "fontsize=17:fontcolor=white@0.88:x=65:y=1710:expansion=none,"
           "drawtext=fontfile="+FONT+":textfile="+str(out/(name+"-brand.txt"))+":"
           "fontsize=33:fontcolor=white:x=65:y=1775:expansion=none,"
           "format=yuv420p,setpts=PTS-STARTPTS[v"+str(i)+"]"
        )
    (out/(name+"-disclosure.txt")).write_text(spec["disclosure"])
    (out/(name+"-brand.txt")).write_text(spec["card"])
    filters.append("".join("[v"+str(i)+"]" for i in range(len(timings)))+"concat=n=4:v=1:a=0[outv]")
    command(["ffmpeg","-hide_banner","-loglevel","error","-y",*inputs,"-i",str(audio),
        "-filter_complex",";".join(filters),"-map","[outv]","-map","4:a",
        "-c:v","libx264","-preset","veryfast","-crf","22",
        "-pix_fmt","yuv420p","-c:a","aac","-b:a","96k","-movflags","+faststart",
        "-t",str(times),str(output)])
    p=ffprobe(output)
    video=next((x for x in p["streams"] if x.get("codec_type")=="video"),{})
    sound=next((x for x in p["streams"] if x.get("codec_type")=="audio"),{})
    duration=float(p["format"]["duration"])
    if (int(video.get("width",0))!=W or int(video.get("height",0))!=H or
        video.get("codec_name")!="h264" or sound.get("codec_name")!="aac" or
        not 15<=duration<=16.5 or output.stat().st_size<250000):
        raise ValueError("reject_bad_video_render")
    return {"file":output.name,"bytes":output.stat().st_size,
            "sha256":hashlib.sha256(output.read_bytes()).hexdigest(),"duration":duration,
            "resolution":"1080x1920","kind":"original_editorial_draft_live_action_broll",
            "notActualSKUFootage":True,"tiktokPosted":False}

def storyboard(name,spec):
    return {"name":name,"source":spec["sourcePage"],"license":spec["licensePage"],
            "hooks":spec["hooks"],"rights":"Commercial license applies to editorial background footage only.",
            "disclosure":spec["disclosure"],
            "promise":"Real moving footage, no simulated SKU use, no guaranteed result, no testimonials",
            "saleCopy":"Not approved for public promotion until actual supplier SKU, fulfillment, media rights and price verified.",
            "buyerLink":spec["url"]}
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--probe-only",action="store_true")
    args=parser.parse_args();validate_sources()
    OUT.mkdir(parents=True,exist_ok=True)
    assets=OUT/"licensed-live-action"
    asset_manifest={};issues=[]
    for name,spec in SRC.items():
        try:asset_manifest[name]=acquire(name,spec,assets)
        except Exception as e:issues.append({"source":name,"error":str(e)[:1300]})
    (OUT/"source-receipts.json").write_text(json.dumps({"sources":asset_manifest,"failures":issues},indent=2)+"\n")
    if args.probe_only:
        print(json.dumps({"status":"SOURCES_OK" if len(asset_manifest)==len(SRC) else "INCOMPLETE",
                          "sources":list(asset_manifest),"failures":issues}))
        if issues:raise SystemExit(1)
        return
    if issues:raise ValueError("No stock fallback. Missing rights-cleared live footage for "+str([x["source"] for x in issues]))
    soundtrack(OUT/"original-music.wav")
    videos=[]
    for name,spec in SRC.items():
        videos.append(render(name,spec,assets/(name+".mp4"),OUT/"original-music.wav",OUT))
    manifest={"schemaVersion":2,"qualityStatus":"drafts_ready_for_human_editorial_review",
       "publishedOnTikTok":False,"autoPostingAllowed":False,
       "qualityFix":"Real moving live-action, 4 shot edits, original soundtrack, category-appropriate text",
       "caveats":["Stock video is not footage of our specific SKU.",
                  "No user review or product-rights verification has been completed.",
                  "No user-approved ad has been released. Publication remains locked."],
       "sourceReceipts":asset_manifest,"videos":videos,
       "storyboards":[storyboard(n,c) for n,c in SRC.items()]}
    (OUT/"review-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps({"status":"DRAFT_VIDEO_RENDERED","videos":videos,"tiktokPosted":False}))
if __name__=="__main__":main()
