#!/usr/bin/env python3
"""GitHub Actions-only original PrismBay product-screen recording and cinematic short renderer."""
from __future__ import annotations
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import wave

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
SITE="https://clean.prismbayai.com"
SRC=ROOT/"public/digital"
OUT=ROOT/"build/authentic-demo-videos"
W,H=1080,1920
BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REGULAR="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
CLIPS=(
  dict(id="pricing-calculator",file="free-pricing-calculator.html",price=None,
       name="Free Service Pricing Calculator",
       url=SITE+"/digital/free-pricing-calculator.html",
       hooks=["STILL GUESSING QUOTES?","HOURS COST MONEY.","MARGIN IS NOT MARKUP.","SEE THE ACTUAL TOOL."],
       lines=["What does this project cost?","Adjust your real working hours.","Test the target gross margin.","Use the free offline calculator."],
       selectors=["","#hours","#margin",".result"]),
  dict(id="stakeholder-toolkit",file="guides/stakeholder-commitments-checklist.html",price=49,
       name="Executive Stakeholder Mapping Toolkit",
       url=SITE+"/digital/guides/stakeholder-commitments-checklist.html",
       hooks=["AFTER THE MEETING...","WHO OWNS THE PROMISE?","WHERE IS THE EVIDENCE?","START WITH A TRACKER."],
       lines=["A contact list is not a follow-up plan.","Capture ownership and due dates.","Separate activity from verified closure.","Free CSV and an optional $49 toolkit."],
       selectors=["",".steps","#download","aside"]),
  dict(id="esg-reporting",file="guides/esg-monthly-reporting-checklist.html",price=99,
       name="ESG & Social Performance Operating Pack",
       url=SITE+"/digital/guides/esg-monthly-reporting-checklist.html",
       hooks=["REPORTING ESG KPIs?","DEFINE THE BOUNDARY.","TRACE EVERY NUMBER.","REVIEW BEFORE REPORTING."],
       lines=["A dashboard is not an evidence trail.","Define sources, periods and metric units.","Keep owners and approvals visible.","Free CSV and an optional $99 pack."],
       selectors=["",".steps","#download","aside"])
)

def caption(c):
    from urllib.parse import urlencode
    query=urlencode(dict(utm_source="tiktok",utm_medium="real_ui_video",utm_campaign="prismbay_demos_202610",utm_content=c["id"]))
    paid=(" Optional "+c["name"]+" for $"+str(c["price"])+" USD, one-time." if c["price"] else "")
    return ("Ad | PrismBay own-brand marketing. Authentic interface screenshots from our real tools. "
            "Free guide: "+c["url"]+"?"+query+"."+paid+
            " Results depend on your own information. #PrismBay #BusinessTools #WorkSmarter")

def manifest():
    return {"schemaVersion":1,"production":"GitHub Actions only",
            "openSource":["Playwright","Chromium","Pillow","FFmpeg"],
            "mediaMode":"authentic_browser_ui_screenshots_with_original_motion_graphics",
            "realActorsUsed":False,"physicalMerchandiseDemos":False,"syntheticTestimonials":False,
            "tiktokPublished":False,"tiktokLockRequired":True,"verifiedPaidSales":0,
            "distribution":"draft_and_owner_review_before_authorized_TikTok_publisher",
            "clips":[{"id":x["id"],"name":x["name"],"priceUsd":x["price"],"target":x["url"],
                      "caption":caption(x),"status":"review_draft","mediaRightsReviewRequired":True} for x in CLIPS]}

def check_inputs():
    assert len(CLIPS)==3
    assert len({x["id"] for x in CLIPS})==3
    for c in CLIPS:
        f=(SRC/c["file"]).resolve()
        if not f.is_file() or SRC.resolve() not in f.parents:raise ValueError("source_file_not_owned")
        if not c["url"].startswith(SITE+"/digital/"):raise ValueError("destination_not_owned")
        if len(c["hooks"])!=4 or len(c["lines"])!=4 or len(c["selectors"])!=4:raise ValueError("scene_count")
        if not c["hooks"] or "guaranteed" in caption(c).lower():raise ValueError("unsupported_claim")
    return True

def screen_capture(out):
    from playwright.sync_api import sync_playwright
    frames=out/"captures";frames.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as p:
        b=p.chromium.launch(headless=True,args=["--no-sandbox"])
        try:
            for c in CLIPS:
                page=b.new_page(viewport={"width":390,"height":844},device_scale_factor=2,
                                reduced_motion="reduce")
                page.goto((SRC/c["file"]).resolve().as_uri(),wait_until="load")
                if page.locator("h1").count()!=1:raise ValueError("invalid_product_ui_"+c["id"])
                if c["id"]=="pricing-calculator":
                    for k,v in (("#hours","12"),("#rate","45"),("#expenses","75"),("#margin","35")):
                        page.locator(k).fill(v)
                for i,selector in enumerate(c["selectors"]):
                    if selector:page.locator(selector).first.scroll_into_view_if_needed(timeout=8000)
                    else:page.evaluate("window.scrollTo(0,0)")
                    page.wait_for_timeout(100)
                    page.screenshot(path=str(frames/(c["id"]+"-"+str(i)+".png")),animations="disabled")
                page.close()
        finally:b.close()
    return frames

def font(size,bold=False):
    return ImageFont.truetype(BOLD if bold else REGULAR,size)

def lines_for(draw,text,max_width,f):
    out=[];line=""
    for word in text.split():
        candidate=(line+" "+word).strip()
        if line and draw.textbbox((0,0),candidate,font=f)[2]>max_width:
            out.append(line);line=word
        else:line=candidate
    if line:out.append(line)
    return out

def scene(c,i,raw,to):
    # All imagery is an authentic capture of an owned PrismBay webpage.
    # The surrounding UI is original composited cinematic product presentation.
    base=Image.new("RGB",(W,H))
    pixels=base.load()
    for y in range(H):
        t=y/(H-1)
        colour=(int(12+20*t),int(37+17*t),int(42+12*t))
        ImageDraw.Draw(base).line([(0,y),(W,y)],fill=colour)
    base=base.convert("RGBA")
    draw=ImageDraw.Draw(base)
    mint=(151,235,186);white=(243,247,245)
    draw.text((78,95),"PRISMBAY   /   REAL PRODUCT SCREENCAP",font=font(24,True),fill=mint)
    y=174
    for line in lines_for(draw,c["hooks"][i],900,font(60,True)):
        draw.text((77,y),line,font=font(60,True),fill=white);y+=75
    screen=Image.open(raw).convert("RGB")
    sw=538;sh=int(sw*screen.height/screen.width)
    screen=screen.resize((sw,sh),Image.Resampling.LANCZOS)
    x=271;py=430
    layer=Image.new("RGBA",base.size,(0,0,0,0));ld=ImageDraw.Draw(layer)
    ld.rounded_rectangle((x-29,py-28,x+sw+29,py+sh+28),radius=67,fill=(0,0,0,150))
    base=Image.alpha_composite(base,layer.filter(ImageFilter.GaussianBlur(34)))
    layer=Image.new("RGBA",base.size,(0,0,0,0));ld=ImageDraw.Draw(layer)
    ld.rounded_rectangle((x-22,py-22,x+sw+22,py+sh+22),radius=53,fill=(24,31,32,255),
                         outline=(177,198,185,255),width=4)
    mask=Image.new("L",screen.size,0)
    ImageDraw.Draw(mask).rounded_rectangle((0,0,screen.width-1,screen.height-1),radius=24,fill=255)
    layer.paste(screen,(x,py),mask)
    ld.rounded_rectangle((x+212,py-13,x+328,py-6),radius=4,fill=(8,11,11,255))
    base=Image.alpha_composite(base,layer)
    d=ImageDraw.Draw(base)
    for j,line in enumerate(lines_for(d,c["lines"][i],900,font(32,True))):
        d.text((80,1640+j*48),line,font=font(32,True),fill=white)
    d.rounded_rectangle((78,1800,1002,1863),radius=18,fill=(42,118,83))
    badge="FREE ONLINE TOOL • LINK IN CAPTION" if not c["price"] else ("FREE CSV   /   OPTIONAL USD "+str(c["price"])+" TOOLKIT")
    d.text((105,1815),badge,font=font(23,True),fill=white)
    to.parent.mkdir(parents=True,exist_ok=True)
    base.convert("RGB").save(to,optimize=True)

def original_audio(target,seconds=18):
    """Original PCM loop created mathematically, no third-party audio."""
    rate=24000
    with wave.open(str(target),"wb") as out:
        out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate)
        values=array.array("h")
        for i in range(rate*seconds):
            t=i/rate
            beat=(t*2)%1
            kick=math.exp(-beat*26)*math.sin((55+42*math.exp(-beat*30))*2*math.pi*t)
            note=math.sin(2*math.pi*(220 if int(t*2)%4<2 else 164.81)*t)*math.exp(-beat*10)
            envelope=max(0,min(1,t/.35,(seconds-t)/.4))
            val=round(32767*.10*(kick+0.14*note)*envelope)
            values.append(max(-32768,min(32767,val)))
        out.writeframes(values.tobytes())

def command(args):
    r=subprocess.run(args,capture_output=True,text=True)
    if r.returncode:raise RuntimeError("ffmpeg_step_failed: "+r.stderr[-2100:])
    return r.stdout

def movie(c,frames,out,music):
    captures=[frames/(c["id"]+"-"+str(i)+".png") for i in range(4)]
    if any(not p.is_file() for p in captures):raise ValueError("missing_actual_capture")
    stills=[]
    for i,src in enumerate(captures):
        f=out/"stills"/c["id"]/("scene-"+str(i)+".png")
        scene(c,i,src,f);stills.append(f)
    inputs=[];filter_parts=[]
    for i,f in enumerate(stills):
        inputs+=["-loop","1","-framerate","30","-t","4.5","-i",str(f)]
        filter_parts.append(
          "["+str(i)+":v]zoompan=z='min(zoom+0.00023,1.04)':d=1:"
          "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
          "s=1080x1920:fps=30,trim=duration=4.5,setpts=PTS-STARTPTS,"
          "fade=t=in:st=0:d=0.1,fade=t=out:st=4.3:d=0.2[v"+str(i)+"]")
    filters=";".join(filter_parts)+";"+"".join("[v"+str(i)+"]" for i in range(4))+"concat=n=4:v=1:a=0[final]"
    video=out/(c["id"]+".mp4")
    command(["ffmpeg","-hide_banner","-loglevel","error","-y",*inputs,"-i",str(music),
             "-filter_complex",filters,"-map","[final]","-map","4:a",
             "-c:v","libx264","-preset","ultrafast","-crf","24","-pix_fmt","yuv420p",
             "-c:a","aac","-b:a","64k","-movflags","+faststart","-shortest",str(video)])
    probe=json.loads(command(["ffprobe","-v","error","-show_format","-show_streams","-of","json",str(video)]))
    v=next((x for x in probe["streams"] if x["codec_type"]=="video"),{})
    a=next((x for x in probe["streams"] if x["codec_type"]=="audio"),{})
    duration=float(probe["format"]["duration"])
    if v.get("width")!=1080 or v.get("height")!=1920 or v.get("codec_name")!="h264" or v.get("pix_fmt")!="yuv420p" or a.get("codec_name")!="aac" or not 17.5<=duration<=18.7:
        raise ValueError("short_video_qa_failed_"+c["id"])
    return dict(id=c["id"],file=video.name,seconds=duration,sizeBytes=video.stat().st_size,
                sha256=hashlib.sha256(video.read_bytes()).hexdigest(),publicationStatus="review_only")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--out",default=str(OUT))
    args=ap.parse_args()
    check_inputs()
    target=Path(args.out);target.mkdir(parents=True,exist_ok=True)
    captures=screen_capture(target)
    music=target/"original-audio.wav"
    original_audio(music)
    videos=[movie(c,captures,target,music) for c in CLIPS]
    data=manifest();data["videos"]=videos
    (target/"media-manifest.json").write_text(json.dumps(data,indent=2)+"\n")
    (target/"tiktok-captions.txt").write_text("\n\n".join(c["id"]+"\n"+caption(c) for c in CLIPS)+"\n")
    print(json.dumps({"status":"PASS","videos":videos,"tiktokPosted":False}))
if __name__=="__main__":main()
