"""Original PrismBay ROI sensitivity infographic, 1080x1920. Illustrative assumptions only."""
from PIL import Image, ImageDraw, ImageFont
import textwrap

W,H=1080,1920
BG=(9,18,34); WHITE=(245,249,253); MUTED=(169,190,209)
CYAN=(70,222,239); GOLD=(250,189,84); GREEN=(111,224,164); RED=(247,126,122)

def font(n,bold=True):
    path="/usr/share/fonts/truetype/dejavu/DejaVuSans"+("-Bold" if bold else "")+".ttf"
    return ImageFont.truetype(path,n)

def txt(d,xy,s,size=44,color=WHITE,bold=True):
    d.text(xy,str(s),font=font(size,bold),fill=color)

def center(d,s,y,size=62,color=WHITE):
    f=font(size); box=d.textbbox((0,0),s,font=f)
    d.text(((W-(box[2]-box[0]))/2,y),s,font=f,fill=color)

def bar(d,x,y,w,amount,maxamount,color):
    d.rounded_rectangle((x,y,x+w,y+70),radius=24,fill=(42,59,78))
    filled=max(20,int(w*amount/maxamount))
    d.rounded_rectangle((x,y,x+filled,y+70),radius=24,fill=color)

def render_frame_roi(segment,index,total,source):
    img=Image.new("RGB",(W,H),BG); d=ImageDraw.Draw(img)
    for x in range(0,W,90):
        d.line((x,0,x,H),fill=(15,31,49),width=1)
    for y in range(0,H,90):
        d.line((0,y,W,y),fill=(15,31,49),width=1)
    d.rectangle((0,0,W,20),fill=CYAN)
    txt(d,(76,88),"PRISMBAY AI",35,CYAN)
    txt(d,(76,145),"AI SYSTEMS, MEASURED  /  ROI LAB",24,MUTED)
    d.line((76,222,1004,222),fill=(66,91,115),width=3)
    headline=segment.get("headline","").upper()
    lines=textwrap.wrap(headline,23)
    d.multiline_text((76,286),"\n".join(lines[:3]),font=font(63),fill=WHITE,spacing=16)
    scene=segment.get("scene","")
    if scene=="hook":
        center(d,"3.5 MONTHS",730,89,GREEN)
        center(d,"VERSUS",860,37,MUTED)
        center(d,"9.7 MONTHS",940,89,GOLD)
        center(d,"SAME AI AGENT.",1220,54,WHITE)
        center(d,"DIFFERENT RESULTS.",1310,50,CYAN)
    elif scene=="baseline":
        center(d,"6,000",695,135,CYAN)
        center(d,"INVOICES / MONTH",865,46,WHITE)
        center(d,"$18,000",1030,110,GOLD)
        center(d,"MANUAL COST BASELINE",1190,36,MUTED)
        center(d,"Illustrative scenario",1390,35,MUTED)
    elif scene=="low":
        center(d,"60%",665,165,GOLD)
        center(d,"STRAIGHT-THROUGH",850,43,WHITE)
        bar(d,120,1035,840,3100,8500,GOLD)
        center(d,"$3,100 / MONTH",1150,72,WHITE)
        center(d,"9.7-MONTH PAYBACK",1290,47,GOLD)
    elif scene=="high":
        center(d,"90%",665,165,GREEN)
        center(d,"STRAIGHT-THROUGH",850,43,WHITE)
        bar(d,120,1035,840,8500,8500,GREEN)
        center(d,"$8,500 / MONTH",1150,72,WHITE)
        center(d,"3.5-MONTH PAYBACK",1290,47,GREEN)
    elif scene=="compare":
        txt(d,(100,660),"60% COMPLETE",43,GOLD)
        bar(d,100,745,880,3100,8500,GOLD)
        txt(d,(100,850),"$3,100 NET / MONTH",48,WHITE)
        txt(d,(100,1070),"90% COMPLETE",43,GREEN)
        bar(d,100,1155,880,8500,8500,GREEN)
        txt(d,(100,1260),"$8,500 NET / MONTH",48,WHITE)
    elif scene=="close":
        center(d,"MEASURE THE",740,70,WHITE)
        center(d,"EXCEPTION RATE",850,69,CYAN)
        center(d,"BEFORE YOU BUY",1040,63,WHITE)
        center(d,"NOT A VENDOR SCORE",1250,41,GOLD)
    else:
        center(d,"REAL ROI = NET BENEFIT",920,50,CYAN)
    body=segment.get("body","")
    if body:
        d.multiline_text((92,1500),"\n".join(textwrap.wrap(body,41)[:3]),font=font(31,False),fill=MUTED,spacing=14)
    d.line((76,1718,1004,1718),fill=(64,89,115),width=3)
    d.rounded_rectangle((76,1765,1004,1785),radius=10,fill=(46,67,89))
    d.rounded_rectangle((76,1765,76+int(928*(index+1)/total),1785),radius=10,fill=CYAN)
    txt(d,(76,1830),"ILLUSTRATIVE USD  |  NOT REALIZED CASH",24,MUTED)
    return img
