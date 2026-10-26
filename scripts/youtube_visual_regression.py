"""Original PrismBay AI regression-testing visual language, 1080x1920 vertical."""
from PIL import Image, ImageDraw, ImageFont
import math

W,H=1080,1920
INK=(14,22,38); WHITE=(242,248,252); SOFT=(176,194,213)
CYAN=(80,223,233); AMBER=(255,194,100); GREEN=(146,237,167); RED=(255,105,123)

def ft(n,bold=False):
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf',n)

def label(d,xy,t,size=34,color=WHITE,bold=False):
    d.text(xy,str(t),font=ft(size,bold),fill=color)

def center(d,box,t,size=37,color=WHITE,bold=True):
    x1,y1,x2,y2=box
    bb=d.textbbox((0,0),str(t),font=ft(size,bold))
    tw=bb[2]-bb[0]; th=bb[3]-bb[1]
    d.text((x1+(x2-x1-tw)/2,y1+(y2-y1-th)/2-8),str(t),font=ft(size,bold),fill=color)

def rounded(d,box,fill,outline=None,r=22,w=4):
    d.rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=w)

def pill(d,box,t,outline=CYAN,size=36):
    rounded(d,box,(20,36,55),outline,20,4)
    center(d,box,t,size)

def arrow(d,x1,y1,x2,y2,color=CYAN):
    d.line((x1,y1,x2,y2),fill=color,width=12)
    ang=math.atan2(y2-y1,x2-x1)
    for a in (ang+2.5,ang-2.5):
        d.line((x2,y2,x2+34*math.cos(a),y2+34*math.sin(a)),fill=color,width=12)

def render_frame_regression(segment,index,total,source):
    scene=segment.get('scene','hook')
    im=Image.new('RGB',(W,H),INK); d=ImageDraw.Draw(im)
    # Blueprint grid with distinctive diagonal edge band.
    for x in range(0,W,90):d.line((x,0,x,H),fill=(24,39,56),width=1)
    for y in range(0,H,90):d.line((0,y,W,y),fill=(24,39,56),width=1)
    d.polygon([(0,0),(W,0),(W,28),(0,120)],fill=CYAN)
    label(d,(75,145),'PRISMBAY AI   /   RELEASE LAB',33,CYAN,True)
    label(d,(75,213),'MODEL CHANGE CONTROL',25,SOFT,True)
    d.line((75,265,1005,265),fill=(68,88,109),width=3)
    headline=str(segment.get('headline','')).strip()
    words=headline.split(); lines=[]; line=''
    for word in words:
        if len(line+' '+word)>22 and line:lines.append(line);line=word
        else:line=(line+' '+word).strip()
    if line:lines.append(line)
    for j,txt in enumerate(lines[:3]):label(d,(75,325+j*87),txt,61,WHITE,True)
    if scene=='hook':
        pill(d,(105,755,475,990),'MODEL A',CYAN,51)
        pill(d,(605,755,975,990),'MODEL B',AMBER,51)
        arrow(d,482,873,596,873,AMBER)
        rounded(d,(120,1115,960,1310),(70,34,47),RED)
        center(d,(120,1115,960,1310),'SAME TASK. NEW FAILURE?',45)
    elif scene=='baseline':
        rounded(d,(105,695,975,1250),(18,36,56),CYAN)
        for j in range(4):
            y=760+j*108
            rounded(d,(155,y,925,y+74),(26,52,73),None,14)
            label(d,(188,y+17),['CUSTOMER EMAIL','INVOICE EXCEPTION','MISSING ATTACHMENT','REFUND REQUEST'][j],31,WHITE,True)
        pill(d,(185,1340,895,1485),'SAVE EXPECTED RESULTS',GREEN,35)
    elif scene=='compare':
        label(d,(125,650),'OLD MODEL',35,CYAN,True)
        label(d,(610,650),'NEW MODEL',35,AMBER,True)
        for j in range(4):
            y=755+j*150
            pill(d,(110,y,455,y+110),['PASS','PASS','PASS','PASS'][j],GREEN,36)
            pill(d,(615,y,960,y+110),['PASS','FAIL','PASS','REVIEW'][j],RED if j==1 else AMBER if j==3 else GREEN,36)
        label(d,(170,1440),'DIFFERENCES NEED REVIEW',33,SOFT,True)
    elif scene=='edge':
        pill(d,(140,660,940,850),'AMBIGUOUS REQUEST',AMBER,41)
        pill(d,(140,950,940,1140),'MISSING DATA',AMBER,46)
        pill(d,(140,1240,940,1430),'CONFLICTING FIELDS',AMBER,40)
    elif scene=='safety':
        pill(d,(130,660,950,860),'NO UNAPPROVED SEND',RED,38)
        pill(d,(130,960,950,1160),'NO PAYMENT RELEASE',RED,41)
        pill(d,(130,1260,950,1460),'NO VENDOR BANK EDIT',RED,38)
    elif scene=='gate':
        pill(d,(145,675,935,870),'TEST AGAINST BASELINE',CYAN,37)
        arrow(d,540,885,540,995,CYAN)
        pill(d,(145,1010,935,1205),'REVIEW DIFFERENCES',AMBER,42)
        arrow(d,540,1220,540,1330,AMBER)
        pill(d,(145,1345,935,1515),'APPROVE OR ROLLBACK',GREEN,40)
    elif scene=='close':
        rounded(d,(90,710,990,1290),(18,43,55),CYAN)
        center(d,(100,750,980,940),'TEST BEFORE',75,WHITE)
        center(d,(100,960,980,1150),'YOU SWITCH',74,GREEN)
        label(d,(145,1330),'PRISMBAY AI  /  PRACTICAL SYSTEMS',30,CYAN,True)
    body=str(segment.get('body','')).strip()
    if body:
        import textwrap
        for j,ln in enumerate(textwrap.wrap(body,width=42)[:3]):
            label(d,(88,1600+j*54),ln,31,SOFT)
    d.line((75,1772,1005,1772),fill=(64,84,104),width=3)
    rounded(d,(75,1810,1005,1830),(36,58,76),None,9)
    rounded(d,(75,1810,75+int(930*(index+1)/total),1830),CYAN,None,9)
    label(d,(75,1850),f'REGRESSION CHECK  /  {index+1:02d} OF {total:02d}',25,SOFT,True)
    return im
