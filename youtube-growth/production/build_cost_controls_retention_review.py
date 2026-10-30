#!/usr/bin/env python3
"""Review-only visual pacing revision for PrismBay AI Cost Controls. Never publish automatically."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
EXPECTED_SHA = "c8da6a5fa46bb1e7ea9dfd6abf82b55d44b80d7fc63fdf515db7362d58be6a72"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
CARDS = [
 ("survey-scope",123,137,"SURVEY SCOPE","250","Senior financial operations leaders","United States  |  United Kingdom  |  India","Cognizant announcement, 22 October 2026. Vendor-sponsored survey."),
 ("survey-finding",137,145,"SURVEY FINDING","72%","of surveyed organizations exceeded AI budgets","in the preceding 12 months","Sample: 250 senior FinOps leaders. Not a global prevalence rate."),
 ("survey-caveat",145,149,"INTERPRET THE EVIDENCE","NOT GLOBAL","The survey describes its sampled organizations.","Measure your own costs before scaling an agent.","Vendor-sponsored research. Not a global business-wide estimate."),
 ("math-acceptance",390,400,"FICTIONAL WORKED EXAMPLE","100  >  80","100 attempted tasks","80 accepted results after quality review","Illustrative figures. No measured customer savings claimed."),
 ("math-costs",400,407,"COUNT THE FULL OPERATING COST","$40 + $60","Model and tool charges  +  human review","Total operating cost: $100","Illustrative figures. Include rework and review."),
 ("math-result",407,414,"COST PER ACCEPTED RESULT","$1.25","$100 total operating cost  /  80 accepted outputs","Only results passing the quality gate count.","Illustrative example, not a real customer invoice.")
]

def digest(path):
    h = hashlib.sha256()
    with open(path,"rb") as f:
        for b in iter(lambda:f.read(1048576),b""): h.update(b)
    return h.hexdigest()

def face(n,bold=False):
    return ImageFont.truetype(BOLD if bold else FONT,n)

def centered(draw, txt, y, n, color, bold=False):
    f = face(n,bold)
    while draw.textbbox((0,0),txt,font=f)[2] > 1700 and n > 28:
        n -= 2
        f = face(n,bold)
    w = draw.textbbox((0,0),txt,font=f)[2]
    draw.text(((1920-w)/2,y),txt,font=f,fill=color)

def card_png(card,path):
    _,_,_,label,hero,one,two,footer = card
    im = Image.new("RGB",(1920,1080),"#061c30")
    d = ImageDraw.Draw(im)
    d.rectangle((0,0,1920,16),fill="#23d3c7")
    d.rounded_rectangle((80,66,140,126),radius=13,fill="#23d3c7")
    d.text((98,74),"P",font=face(42,True),fill="#04202b")
    d.text((158,78),"PRISMBAY AI",font=face(35,True),fill="white")
    d.text((1450,84),"AI SYSTEMS UNDER CONTROL",font=face(24),fill="#7fabc3")
    d.rounded_rectangle((115,215,1805,880),radius=34,fill="#10334a",outline="#1e7887",width=3)
    centered(d,label,263,47,"#23d3c7",True)
    centered(d,hero,365,158,"white",True)
    centered(d,one,638,50,"#eaf6fb",True)
    centered(d,two,718,43,"#9fc9da")
    d.line((110,950,1810,950),fill="#1b6978",width=2)
    d.text((116,970),footer,font=face(27),fill="#9dc2d2")
    d.text((1630,970),"prismbayai.com",font=face(25),fill="#9dc2d2")
    im.save(path,optimize=True)

def main():
    a = argparse.ArgumentParser()
    a.add_argument("--input",required=True)
    a.add_argument("--output",required=True)
    a.add_argument("--asset-dir",default="retention-assets")
    a.add_argument("--manifest",default="retention-review-manifest.json")
    args = a.parse_args()
    src, out, assets = Path(args.input),Path(args.output),Path(args.asset_dir)
    if digest(src) != EXPECTED_SHA:
        raise SystemExit("Source SHA256 mismatch: revision refused")
    assets.mkdir(parents=True,exist_ok=True)
    out.parent.mkdir(parents=True,exist_ok=True)
    images=[]
    for c in CARDS:
        p=assets/(c[0]+".png")
        card_png(c,p)
        images.append(p)
    cmd=["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(src)]
    for p in images: cmd += ["-i",str(p)]
    filters=[]
    prev="0:v"
    for i,c in enumerate(CARDS):
        name=f"v{i}"
        filters.append(f"[{prev}][{i+1}:v]overlay=x=0:y=0:enable='gte(t,{c[1]})*lt(t,{c[2]})':eof_action=repeat:format=auto[{name}]")
        prev=name
    cmd += ["-filter_complex",";".join(filters),"-map",f"[{prev}]","-map","0:a:0",
            "-c:v","libx264","-preset","ultrafast","-crf","20","-pix_fmt","yuv420p",
            "-c:a","copy","-movflags","+faststart",str(out)]
    subprocess.run(cmd,check=True)
    probe=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_entries",
         "format=duration:stream=codec_type,codec_name,width,height","-of","json",str(out)]))
    duration=float(probe["format"]["duration"])
    if abs(duration-559.503) > 0.25: raise SystemExit("Duration changed unexpectedly")
    report={"channelId":CHANNEL,"sourceSha256":EXPECTED_SHA,"outputSha256":digest(out),
      "durationSeconds":duration,"reviewOnly":True,"publicationApproved":False,
      "uploadPermitted":False,"paidSpendUSD":0,"originalAudioPreserved":True,
      "captions":"SEPARATE_CORRECTED_SRT_PENDING_SPOKEN_SYNC",
      "cards":[{"id":c[0],"start":c[1],"end":c[2]} for c in CARDS],
      "outstanding":["Full narration listening","Spoken caption alignment",
        "Continuous mobile playback","Voice and dependency rights","Native Studio authorization"]}
    Path(args.manifest).write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report,indent=2))

if __name__=="__main__":
    main()
