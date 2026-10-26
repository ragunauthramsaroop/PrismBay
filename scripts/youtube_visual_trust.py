"""PrismBay original trust-boundary explainer scenes. Diagram-first, no stock assets."""
from PIL import Image, ImageDraw, ImageFont
import textwrap

W,H=1080,1920
NAVY=(12,23,38); WHITE=(250,251,252); INK=(27,41,58)
TEAL=(18,143,144); RED=(198,61,66); GOLD=(224,149,55)
GRAY=(111,127,140); PALE=(229,239,241); LINE=(200,215,222)

def ft(size,bold=False):
    n="DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/"+n,size)

def label(d,xy,txt,size=35,col=INK,bold=True):
    d.text(xy,str(txt),font=ft(size,bold),fill=col)

def centered(d,txt,box,size,col=INK):
    x1,y1,x2,y2=box
    f=ft(size,True); b=d.textbbox((0,0),txt,font=f)
    d.text((x1+(x2-x1-(b[2]-b[0]))/2,y1+(y2-y1-(b[3]-b[1]))/2-4),txt,font=f,fill=col)

def card(d,box,border=TEAL,fill=WHITE,r=22):
    d.rounded_rectangle(box,radius=r,fill=fill,outline=border,width=5)

def arrow(d,x1,y1,x2,y2,col=TEAL,width=12):
    d.line((x1,y1,x2,y2),fill=col,width=width)
    if x2>x1:
        d.polygon([(x2,y2),(x2-29,y2-19),(x2-29,y2+19)],fill=col)
    elif y2>y1:
        d.polygon([(x2,y2),(x2-19,y2-28),(x2+19,y2-28)],fill=col)

def render_frame_trust(segment,index,total,source):
    im=Image.new("RGB",(W,H),(246,249,250)); d=ImageDraw.Draw(im)
    d.rectangle((0,0,W,34),fill=NAVY)
    d.rectangle((0,34,21,H),fill=TEAL)
    label(d,(84,87),"PRISMBAY AI  /  SECURITY LAB",32,TEAL)
    label(d,(84,152),"PROMPT INJECTION  •  BUSINESS CONTROLS",22,GRAY)
    d.line((84,215,996,215),fill=LINE,width=3)
    head="\n".join(textwrap.wrap(segment.get("headline",""),width=21))
    d.multiline_text((85,275),head,font=ft(59,True),fill=NAVY,spacing=13)
    s=segment.get("scene","opening")
    if s=="opening":
        card(d,(112,695,645,1285),LINE,WHITE,18)
        d.polygon([(540,695),(645,800),(540,800)],fill=PALE)
        label(d,(150,755),"SUPPLIER.PDF",41,NAVY)
        for y in (865,920,975,1030):
            d.rounded_rectangle((155,y,545,y+17),radius=7,fill=LINE)
        card(d,(145,1115,602,1208),RED,(254,238,238),13)
        centered(d,"HIDDEN COMMAND",(153,1124,595,1198),31,RED)
        arrow(d,650,1000,770,1000,RED)
        card(d,(778,875,1003,1125),TEAL,PALE,30)
        centered(d,"AI",(795,940,984,1060),84,TEAL)
    elif s=="payload":
        card(d,(95,650,985,1240),LINE,WHITE,24)
        label(d,(140,705),"INVOICE  #4821",43,NAVY)
        label(d,(140,795),"Vendor: Example Supplier",30,GRAY,False)
        label(d,(140,850),"Amount: $2,000 (illustrative)",29,GRAY,False)
        d.line((140,938,945,938),fill=LINE,width=3)
        card(d,(126,975,954,1150),RED,(255,239,240),16)
        centered(d,"CHANGE BANK DETAILS",(145,1015,935,1115),40,RED)
        centered(d,"DATA  IS NOT  AUTHORITY",(105,1285,975,1400),42,NAVY)
    elif s=="boundary":
        card(d,(95,655,985,810),GOLD,(255,250,239))
        centered(d,"UNTRUSTED DOCUMENT",(110,675,970,785),44,NAVY)
        arrow(d,540,816,540,920,TEAL)
        card(d,(110,925,970,1090),TEAL,PALE)
        centered(d,"EXTRACT FACTS ONLY",(120,955,960,1060),44,TEAL)
        arrow(d,540,1095,540,1190,TEAL)
        for x,t in ((100,"VENDOR"),(410,"AMOUNT"),(720,"DATE")):
            card(d,(x,1195,x+270,1345),TEAL,WHITE,17)
            centered(d,t,(x+8,1240,x+260,1310),31,NAVY)
        label(d,(125,1410),"DOCUMENT COMMANDS: BLOCKED",31,RED)
    elif s=="permissions":
        for y,name,allow in ((685,"READ INVOICE",True),(920,"EDIT BANK ACCOUNT",False),(1155,"RELEASE PAYMENT",False)):
            col=TEAL if allow else RED
            card(d,(105,y,975,y+184),col,WHITE,23)
            label(d,(145,y+43),name,37,NAVY)
            centered(d,"ALLOW" if allow else "DENY",(720,y+70,950,y+152),34,col)
        label(d,(125,1435),"SERVER CHECKS EVERY TOOL CALL",31,GRAY)
    elif s=="approval":
        card(d,(110,690,970,865),GOLD,(255,249,236))
        centered(d,"PROPOSED CHANGE",(130,720,950,835),47,NAVY)
        arrow(d,540,872,540,964,TEAL)
        card(d,(110,970,970,1145),TEAL,PALE)
        centered(d,"NAMED HUMAN APPROVES",(130,1000,950,1115),40,TEAL)
        arrow(d,540,1152,540,1242,TEAL)
        card(d,(110,1250,970,1400),NAVY,WHITE)
        centered(d,"SERVER VALIDATES + LOGS",(125,1285,955,1370),35,NAVY)
    elif s=="close":
        for i,(title,sub,col) in enumerate((("01  SEPARATE","Documents from instructions",GOLD),("02  RESTRICT","Tools and destinations",RED),("03  APPROVE","Sensitive actions",TEAL))):
            y=680+i*235
            card(d,(105,y,975,y+191),col,WHITE)
            label(d,(143,y+28),title,45,col)
            label(d,(143,y+110),sub,28,GRAY,False)
        centered(d,"TEST BEFORE DEPLOYMENT",(100,1460,980,1555),39,NAVY)
    else:
        card(d,(130,760,950,1240),TEAL,WHITE)
        centered(d,"KEEP CONTROL OUTSIDE AI",(140,890,940,1110),39,NAVY)
    body="\n".join(textwrap.wrap(segment.get("body",""),width=43))
    if body:
        d.multiline_text((98,1560),body,font=ft(29),fill=GRAY,spacing=12)
    d.line((85,1730,995,1730),fill=LINE,width=3)
    d.rounded_rectangle((85,1775,995,1794),radius=9,fill=LINE)
    d.rounded_rectangle((85,1775,85+int(910*(index+1)/total),1794),radius=9,fill=TEAL)
    label(d,(85,1830),f"PRISMBAY AI  /  {index+1:02d} OF {total:02d}",26,NAVY)
    return im
