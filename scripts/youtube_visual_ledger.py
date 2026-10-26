"""Original PrismBay invoice-unit-economics visual scenes. No stock media."""
from PIL import Image, ImageDraw, ImageFont
import math
import textwrap

W, H = 1080, 1920
PAPER=(249,248,245); INK=(20,38,55); BLUE=(28,105,183)
ORANGE=(237,145,60); GREEN=(33,138,103); RED=(185,66,62)
GRAY=(102,118,129); WHITE=(255,255,255)

def f(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/"+name,size)

def centered(d, label, box, size, color=INK):
    ft=f(size,True); x1,y1,x2,y2=box
    b=d.textbbox((0,0),label,font=ft)
    d.text((x1+(x2-x1-(b[2]-b[0]))/2,y1+(y2-y1-(b[3]-b[1]))/2-6),label,font=ft,fill=color)

def box(d, xy, color=BLUE, fill=WHITE, radius=24, width=5):
    d.rounded_rectangle(xy,radius=radius,fill=fill,outline=color,width=width)

def label(d,xy,text,size=40,color=INK):
    d.text(xy,text,font=f(size,True),fill=color)

def render_frame_ledger(segment,index,total,source):
    img=Image.new("RGB",(W,H),PAPER); d=ImageDraw.Draw(img)
    d.rectangle((0,0,W,24),fill=INK)
    d.rectangle((0,24,18,H),fill=ORANGE)
    label(d,(82,86),"PRISMBAY AI  /  OPERATIONS LAB",33,BLUE)
    d.text((84,151),"UNIT ECONOMICS  •  HYPOTHETICAL EXAMPLE",font=f(24,True),fill=GRAY)
    d.line((84,217,998,217),fill=(214,218,220),width=3)
    head="\n".join(textwrap.wrap(segment.get("headline",""),width=22))
    d.multiline_text((82,285),head,font=f(60,True),fill=INK,spacing=15)
    scene=segment.get("scene","")
    if scene=="hook":
        d.arc((262,660,818,1216),30,330,fill=BLUE,width=50)
        centered(d,"85%",(290,815,790,1015),118,BLUE)
        box(d,(123,1255,960,1388),RED,WHITE)
        centered(d,"NOT 85% SAVINGS",(133,1273,950,1370),53,RED)
    elif scene=="baseline":
        box(d,(110,685,970,925),BLUE)
        centered(d,"1,000 INVOICES",(130,708,950,895),66,INK)
        label(d,(142,1012),"MANUAL COST PER ITEM",34,GRAY)
        centered(d,"$1.20",(165,1070,915,1240),107,BLUE)
        box(d,(118,1285,960,1410),GREEN,(234,247,241))
        centered(d,"BASELINE  $1,200",(125,1295,955,1402),49,GREEN)
    elif scene=="usage":
        for j,(txt,amount,col) in enumerate([
            ("MODEL / SOFTWARE","$400",BLUE),
            ("150 HUMAN REVIEWS","$450",ORANGE),
            ("20 ERROR CORRECTIONS","$200",RED)]):
            y=645+j*255; box(d,(96,y,985,y+205),col)
            label(d,(133,y+28),txt,32,GRAY)
            label(d,(137,y+89),amount,74,col)
    elif scene=="exceptions":
        for j,(n,formula,col) in enumerate([
            ("REVIEW QUEUE","150 x $3 = $450",ORANGE),
            ("POST-ACCEPTANCE REWORK","20 x $10 = $200",RED)]):
            y=720+j*325; box(d,(95,y,990,y+260),col)
            label(d,(130,y+37),n,31,GRAY)
            label(d,(130,y+119),formula,57,col)
    elif scene=="total":
        label(d,(110,650),"MANUAL BASELINE",33,GRAY)
        d.rounded_rectangle((115,728,930,818),radius=18,fill=BLUE)
        label(d,(125,743),"$1,200",55,WHITE)
        label(d,(110,883),"AI PILOT TOTAL COST",33,GRAY)
        d.rounded_rectangle((115,965,828,1055),radius=18,fill=ORANGE)
        label(d,(125,978),"$1,050",55,WHITE)
        box(d,(112,1155,970,1400),GREEN,(232,246,239))
        centered(d,"$150",(135,1185,948,1325),108,GREEN)
        centered(d,"NET BEFORE SETUP COST",(132,1324,952,1394),30,GREEN)
    elif scene=="close":
        for j,(txt,col) in enumerate([
            ("COST / ACCEPTED ITEM",BLUE),
            ("EXCEPTION RATE",ORANGE),
            ("REWORK COST",RED),
            ("QUALITY FAILURES",GREEN)]):
            x=93+(j%2)*468; y=695+(j//2)*295
            box(d,(x,y,x+425,y+238),col)
            centered(d,f"{j+1:02d}",(x+15,y+25,x+405,y+117),66,col)
            words="\n".join(textwrap.wrap(txt,width=17))
            d.multiline_text((x+26,y+144),words,font=f(27,True),fill=INK,spacing=6)
    else:
        box(d,(100,715,980,1310),BLUE)
        centered(d,"MEASURE REAL RESULTS",(110,895,970,1110),40,BLUE)
    body="\n".join(textwrap.wrap(segment.get("body",""),width=40))
    d.multiline_text((96,1488),body,font=f(34),fill=GRAY,spacing=14)
    d.line((85,1730,995,1730),fill=(207,213,218),width=3)
    d.rounded_rectangle((85,1780,995,1800),radius=10,fill=(218,224,229))
    d.rounded_rectangle((85,1780,85+int(910*(index+1)/total),1800),radius=10,fill=BLUE)
    d.text((86,1833),"PRISMBAY AI   /   ILLUSTRATIVE, NOT MEASURED",font=f(24,True),fill=INK)
    return img
