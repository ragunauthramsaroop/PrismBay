"""Original forensic visual system for PrismBay AI incident explainer. No stock assets."""
from PIL import Image, ImageDraw
from pathlib import Path
import textwrap

W,H=1080,1920
INK=(9,18,30); WHITE=(244,248,252); GRAY=(176,192,208)
CYAN=(70,224,229); RED=(255,91,107); GOLD=(247,186,82); GREEN=(127,232,165)

def render_frame_incident(segment, index, total, source):
    from PIL import ImageFont
    def f(size,bold=False):
        n="DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        p=Path("/usr/share/fonts/truetype/dejavu")/n
        return ImageFont.truetype(str(p),size)
    def t(x,y,txt,size=37,color=WHITE,bold=False):
        d.text((x,y),txt,font=f(size,bold),fill=color)
    def box(x1,y1,x2,y2,outline=CYAN,fill=(17,35,50),radius=22):
        d.rounded_rectangle((x1,y1,x2,y2),radius=radius,fill=fill,outline=outline,width=5)
    def lines(text,chars=23):
        return "\n".join(textwrap.wrap(str(text),width=chars))
    img=Image.new("RGB",(W,H),INK); d=ImageDraw.Draw(img)
    for y in range(0,H,90):
        d.line((0,y,W,y),fill=(18,37,53),width=1)
    d.rectangle((0,0,W,26),fill=RED)
    t(78,86,"PRISMBAY AI   /   INCIDENT REVIEW",29,CYAN,True)
    t(78,151,"ORIGINAL BUSINESS CONTROL ANALYSIS",22,GRAY,True)
    d.line((78,210,1000,210),fill=(72,92,111),width=3)
    d.multiline_text((78,275),lines(segment.get("headline",""),23),font=f(63,True),fill=WHITE,spacing=12)
    scene=segment.get("scene","incident")
    if scene=="alert":
        box(115,670,965,1180,RED,(57,20,32),40)
        t(215,755,"MONITOR",94,WHITE,True)
        t(285,895,"OFFLINE",96,RED,True)
        d.line((250,1030,840,1030),fill=RED,width=24)
        t(205,1240,"The safety boundary failed.",38,GOLD,True)
    elif scene=="timeline":
        d.line((190,690,190,1370),fill=CYAN,width=13)
        for y,date,label in [(725,"OCT 03","ALERTS SUPPRESSED"),(1060,"OCT 06","MONITOR REMOVED")]:
            d.ellipse((164,y-6,217,y+47),fill=GOLD)
            t(285,y-5,date,47,GOLD,True)
            box(275,y+85,962,y+218,RED)
            t(309,y+128,label,35,WHITE,True)
    elif scene=="boundary":
        box(92,710,988,900,CYAN)
        t(185,770,"AI AGENT: LIMITED TOOLS",43,CYAN,True)
        d.line((110,985,970,985),fill=RED,width=20)
        t(280,1010,"NO WRITE ACCESS",43,RED,True)
        box(92,1115,988,1320,GREEN)
        t(160,1175,"INDEPENDENT MONITOR",44,GREEN,True)
    elif scene=="approval":
        for j,(lab,col) in enumerate([("CHANGE REQUEST",CYAN),("HUMAN APPROVAL",GOLD),("AUDIT + EXECUTION",GREEN)]):
            y=655+j*235;box(115,y,965,y+158,col)
            t(183,y+53,lab,43,col,True)
            if j<2:
                d.line((540,y+162,540,y+230),fill=WHITE,width=9)
    elif scene=="verify":
        box(90,665,990,960,RED)
        t(170,730,"AGENT CLAIMS:",37,GRAY,True)
        t(155,820,"'MONITOR IS ON'",57,WHITE,True)
        box(90,1050,990,1340,GREEN)
        t(175,1110,"SYSTEM CHECK:",37,GRAY,True)
        t(160,1200,"VERIFY ACTUAL STATE",43,GREEN,True)
    elif scene=="close":
        for j,(lab,col) in enumerate([("SEPARATE MONITORING",CYAN),("APPROVE CHANGES",GOLD),("VERIFY AFTER DEPLOY",GREEN)]):
            y=660+j*235;box(105,y,975,y+170,col)
            t(150,y+58,f"{j+1:02d}  {lab}",36,col,True)
    else:
        box(105,760,975,1220,CYAN)
        t(200,940,"CHECK THE BOUNDARY",39,CYAN,True)
    if segment.get("body"):
        d.multiline_text((92,1470),lines(segment["body"],40),font=f(34),fill=GRAY,spacing=14)
    t(78,1660,"SOURCE: OPENAI ALIGNMENT, OCT 20 2026",23,GRAY,True)
    d.line((78,1750,1000,1750),fill=(80,100,120),width=2)
    d.rounded_rectangle((78,1790,1000,1810),radius=9,fill=(37,55,73))
    d.rounded_rectangle((78,1790,78+int(922*(index+1)/total),1810),radius=9,fill=CYAN)
    t(78,1840,f"PRISMBAY AI   /   {index+1:02d} OF {total:02d}",25,WHITE,True)
    return img
