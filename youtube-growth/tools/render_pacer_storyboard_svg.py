#!/usr/bin/env python3
"""Create editable, original 1920x1080 P-A-C-E-R scene SVGs from the canonical storyboard.
Design-only assets: no narration, captions, video publication or editorial approval.
Standard library only. Never changes a YouTube or Metricool account.
"""
import argparse
import html
import json
from pathlib import Path
import zipfile

W, H = 1920, 1080
NAVY, CARD, WHITE = "#091528", "#142641", "#F4F8FF"
CYAN, AMBER, RED, GREEN, MUTED = "#58E2D2", "#FFC476", "#FF8D92", "#7CE6A4", "#A9BDD4"

def text(x, y, value, size=35, color=WHITE, weight=600, anchor="start"):
    value = html.escape(str(value))
    return f'<text x="{x}" y="{y}" fill="{color}" font-family="DejaVu Sans, Arial, sans-serif" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{value}</text>'

def box(x, y, w, h, title, subtitle="", accent=CYAN):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="{CARD}" stroke="{accent}" stroke-width="3"/>'
            + f'<rect x="{x+24}" y="{y+24}" width="10" height="{h-48}" rx="5" fill="{accent}"/>'
            + text(x+56, y+76, title, 35, WHITE, 700)
            + text(x+56, y+132, subtitle, 25, MUTED))

def arrow(x, y, x2, color=CYAN):
    return (f'<path d="M{x},{y} H{x2}" stroke="{color}" stroke-width="6" fill="none"/>'
            + f'<path d="M{x2},{y} l-20,-13 v26 z" fill="{color}"/>')

def scene_graphic(i):
    if i in (2,17,21):
        labels=["PURPOSE","AUTHORITY","CONTROLS","EVIDENCE","REVERSAL"]
        return "".join(box(155+j*330,390,300,245,"PACER"[j],labels[j],CYAN if j%2==0 else AMBER) for j in range(5))
    if i in (1,11):
        labels = ["DRAFT","SEND","BANK EDIT","PAY"] if i==1 else ["NORMAL","MISSING","DUPLICATE","LIMIT","BANK EDIT","INJECTION","OUTAGE"]
        return "".join(box(145+(j%4)*425,345+(j//4)*175,400,155,s,"TEST / PERMISSION",GREEN if j==0 else AMBER) for j,s in enumerate(labels))
    if i in (9,16,19):
        labels = (["PROPOSE","HUMAN APPROVAL","EXECUTE"] if i==9 else
                  ["STOP","RECOVER","REVIEW"] if i==16 else
                  ["READ ONLY","DRAFT + APPROVE","LIMITED EXECUTION"])
        return "".join(box(135+j*550,390,510,260,s,"INDEPENDENT CONTROL",GREEN if j==0 else AMBER) for j,s in enumerate(labels))
    if i==14:
        return "".join(box(150+j*550,395,520,245,s,"EXPECTED: BLOCKED",RED) for j,s in enumerate(["DUPLICATE","BANK CHANGE","NO APPROVAL"]))
    if i==20:
        return "".join(box(155+(j%3)*545,355+(j//3)*175,515,150,s,"SHOW EVIDENCE",CYAN) for j,s in enumerate(["DENIAL","BOUND APPROVAL","DUPLICATE","AUDIT LOG","STOP CONTROL"]))
    pairs = {
        0:("AI AGENT","PROPOSES ACTION","PAYMENT","POLICY LOCKED",CYAN,RED),
        3:("400 REQUESTS / MONTH","FICTIONAL EXAMPLE","NO CUSTOMER DATA","ILLUSTRATIVE ONLY",AMBER,CYAN),
        4:("DEMO","ORDER DRAFTED","EVIDENCE","APPROVAL UNVERIFIED",GREEN,RED),
        5:("IN SCOPE","CATALOG DRAFT","OUT OF SCOPE","BANK EDIT / PAY",GREEN,RED),
        6:("INPUTS + OUTPUTS","DRAFT ONLY","EXCLUSIONS","PAYMENTS / BANK EDITS",GREEN,RED),
        7:("READ + DRAFT","NARROW TOKEN","EDIT + PAY","DENIED",GREEN,RED),
        8:("AGENT","PROPOSES","POLICY ENGINE","DECIDES INDEPENDENTLY",CYAN,AMBER),
        10:("APPROVED","SUPPLIER A","ALTERED","SUPPLIER B",GREEN,RED),
        12:("ACTION + VERDICT","INDEPENDENT EVENT","AUDIT RECORD","AGENT CANNOT EDIT",CYAN,GREEN),
        13:("SUPPLIER PDF","UNTRUSTED CONTENT","POLICY","REJECT INSTRUCTIONS",AMBER,RED),
        15:("REVOKE ACCESS","STOP EXECUTION","RECOVER","REVIEW STATE",RED,GREEN),
        18:("OPERATIONS","ACCEPTED OUTPUTS","FINANCE","VERIFIED CASH CHANGE",CYAN,GREEN),
    }
    a,b,c,d,e,f = pairs[i]
    return box(165,370,750,295,a,b,e)+arrow(945,520,1030)+box(1060,370,700,295,c,d,f)

def render(s,i,n):
    title=s["on_screen"]
    size=56 if len(title)>38 else 68
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f'<rect width="{W}" height="{H}" fill="{NAVY}"/>',
         f'<rect width="{W}" height="12" fill="{CYAN}"/>',
         text(150,115,"PRISMBAY AI / AI SYSTEMS, MEASURED",27,CYAN,700),
         text(1755,115,f"{i+1:02d} / {n:02d}",28,MUTED,600,"end"),
         text(150,225,title,size,WHITE,750),
         text(150,285,s["shot"].upper(),26,MUTED),
         scene_graphic(i),
         f'<path d="M150,865 H1770" stroke="#2A425E" stroke-width="2"/>',
         text(150,918,f'{s["start_s"]//60:02d}:{s["start_s"]%60:02d} - {s["end_s"]//60:02d}:{s["end_s"]%60:02d} | STORYBOARD FRAME, NOT FINAL VIDEO',24,MUTED),
         text(1770,918,"@PrismBayAI",26,CYAN,650,"end"),
         text(150,984,"HYPOTHETICAL EDUCATIONAL EXAMPLE. NOT A LIVE SYSTEM OR VENDOR CERTIFICATION.",21,AMBER),
         "</svg>"]
    return "\n".join(svg)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("storyboard",type=Path)
    p.add_argument("--out",type=Path,default=Path("pacer_scene_pack"))
    args=p.parse_args()
    data=json.loads(args.storyboard.read_text(encoding="utf-8"))
    assert data["channel_id"]=="UCw2hs85TzIpdKwJtG-BSxzQ"
    assert data["handle"]=="@PrismBayAI"
    scenes=data["scenes"]
    assert len(scenes)==22 and scenes[0]["start_s"]==0 and scenes[-1]["end_s"]==570
    assert all(s["end_s"]>s["start_s"] and (i==0 or s["start_s"]==scenes[i-1]["end_s"]) for i,s in enumerate(scenes))
    args.out.mkdir(parents=True,exist_ok=True)
    manifest={"channel_id":data["channel_id"],"status":"VISUAL_PREPRODUCTION_ONLY_NOT_PUBLISHED","scenes":[]}
    for i,s in enumerate(scenes):
        name=f"pacer_scene_{i+1:02d}.svg"
        (args.out/name).write_text(render(s,i,len(scenes)),encoding="utf-8")
        manifest["scenes"].append({"file":name,"start_s":s["start_s"],"end_s":s["end_s"]})
    (args.out/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    with zipfile.ZipFile(args.out.with_suffix(".zip"),"w",zipfile.ZIP_DEFLATED) as z:
        for f in sorted(args.out.glob("*")):z.write(f,f.name)
    print(f"Created {len(scenes)} editable original SVG frames and ZIP at {args.out.with_suffix('.zip')}")

if __name__=="__main__":
    main()
