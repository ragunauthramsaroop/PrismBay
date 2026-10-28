"""Original PrismBay AI unit-economics visual treatment for 1080x1920 Shorts.

Seven distinct editorial scenes. All financial figures are explicitly hypothetical.
No external imagery, vendor logos, stock footage or paid assets.
The lower visual band is reserved for portrait-safe subtitles after independent review.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

W, H = 1080, 1920
NAVY=(9,17,31); WHITE=(247,250,255); MUTED=(167,189,211)
CYAN=(64,225,224); LIME=(172,243,150); CORAL=(255,128,116)
GOLD=(255,197,104); PANEL=(19,35,55); GRID=(30,49,70)

def f(size, bold=False):
    name='DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    for p in [f'/usr/share/fonts/truetype/dejavu/{name}', f'/usr/share/fonts/dejavu/{name}']:
        if Path(p).exists(): return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def tx(d, text, x, y, size, color=WHITE, bold=False, max_width=860, min_size=24):
    while size > min_size and d.textbbox((0,0),text,font=f(size,bold))[2] > max_width:
        size -= 2
    if d.textbbox((0,0),text,font=f(size,bold))[2] > max_width:
        raise ValueError(f'Text too wide at min size: {text!r}')
    d.text((x,y),text,font=f(size,bold),fill=color)

def box(d, xy, fill=PANEL, stroke=GRID, r=28, width=3):
    d.rounded_rectangle(xy,radius=r,fill=fill,outline=stroke,width=width)

def label(d, text, x, y, color=CYAN):
    tx(d,text,x,y,28,color,True,860)

def header(d, topic, n, total):
    d.rectangle((0,0,W,22),fill=CYAN)
    tx(d,'PRISMBAY AI',72,80,34,CYAN,True)
    tx(d,topic,72,150,25,MUTED,True)
    d.line((72,210,982,210),fill=GRID,width=3)
    d.rectangle((72,1764,982,1778),fill=GRID)
    d.rectangle((72,1764,72+int(910*(n+1)/total),1778),fill=CYAN)
    tx(d,'ILLUSTRATIVE NUMBERS. NOT COMPANY RESULTS.',72,1812,22,MUTED,True)

def base(topic, n, total):
    im=Image.new('RGB',(W,H),NAVY)
    d=ImageDraw.Draw(im)
    for y in range(280,1680,120):
        d.line((60,y,1020,y),fill=(14,30,47),width=2)
    header(d,topic,n,total)
    return im,d

def center(d,text,y,size,color=WHITE,bold=True):
    ft=f(size,bold)
    while d.textbbox((0,0),text,font=ft)[2]>850:
        size-=2; ft=f(size,bold)
    bounds=d.textbbox((0,0),text,font=ft)
    x=(W-(bounds[2]-bounds[0]))/2
    d.text((x,y),text,font=ft,fill=color)

def scene_hook(d):
    tx(d,'5X',78,318,240,CYAN,True)
    tx(d,'COST EFFICIENCY?',78,624,70,WHITE,True)
    box(d,(75,804,987,967),fill=(37,50,69),stroke=GOLD)
    center(d,"VENDOR'S EARLY CLAIM",852,43,GOLD)
    box(d,(75,1030,987,1360),fill=(19,53,58),stroke=CYAN,width=5)
    center(d,'NOT YOUR',1100,78,WHITE)
    center(d,'SAVINGS',1220,95,CYAN)
    tx(d,'Source: Reuters, 26 Oct 2026',79,1430,28,MUTED)

def scene_formula(d):
    tx(d,'THE METRIC',78,318,84,WHITE,True)
    tx(d,'TO TEST',78,430,92,CYAN,True)
    box(d,(72,670,990,1230),fill=(17,39,55),stroke=CYAN,width=5)
    center(d,'TOTAL WORKFLOW COST',758,54,WHITE)
    d.line((155,927,910,927),fill=CYAN,width=8)
    center(d,'ACCEPTED OUTPUTS',1010,59,LIME)
    center(d,'NOT PRICE PER CALL',1310,52,GOLD)

def bar(d,y,parts,colors):
    left=120; width=820; total=sum(parts)
    for val,col in zip(parts,colors):
        w=round(width*val/total)
        d.rectangle((left,y,left+w,y+92),fill=col)
        left+=w

def scene_option(d,name,per_run,accepted,total,parts,price,col):
    tx(d,name,78,316,88,col,True)
    box(d,(78,480,980,710),fill=(18,36,55),stroke=col,width=5)
    tx(d,per_run,112,532,69,WHITE,True)
    tx(d,'PER RUN',113,625,29,MUTED,True)
    tx(d,'TOTAL COST',92,804,34,MUTED,True)
    tx(d,total,90,852,106,WHITE,True)
    tx(d,'ACCEPTED',590,804,34,MUTED,True)
    tx(d,accepted,584,852,96,LIME,True)
    bar(d,1104,parts,[CYAN,GOLD,CORAL])
    tx(d,'INFERENCE     REVIEW     REWORK',110,1230,29,MUTED,True)
    box(d,(78,1290,980,1445),fill=(25,57,57),stroke=LIME,width=5)
    tx(d,'COST / ACCEPTED',112,1302,28,MUTED,True)
    tx(d,price,110,1340,79,LIME,True)

def scene_compare(d):
    tx(d,'CHEAPEST RUN',78,308,68,WHITE,True)
    tx(d,'IS NOT THE GOAL',78,402,67,CYAN,True)
    tx(d,'MODEL',80,630,30,MUTED,True)
    tx(d,'PER RUN',380,630,30,MUTED,True)
    tx(d,'PER ACCEPTED',660,630,30,MUTED,True)
    box(d,(75,712,990,927),fill=(32,44,58),stroke=CORAL)
    tx(d,'A',111,765,79,CORAL,True)
    tx(d,'$0.10',350,780,57,WHITE,True)
    tx(d,'$0.56',670,780,57,CORAL,True)
    box(d,(75,973,990,1190),fill=(22,60,54),stroke=LIME,width=5)
    tx(d,'B',111,1024,79,LIME,True)
    tx(d,'$0.25',350,1039,57,WHITE,True)
    tx(d,'$0.48',670,1039,57,LIME,True)
    box(d,(75,1250,990,1440),fill=(20,55,59),stroke=CYAN)
    center(d,'B WINS THIS',1280,58,WHITE)
    center(d,'FICTIONAL EXAMPLE',1360,50,CYAN)

def scene_pilot(d):
    tx(d,'PILOT BEFORE',76,300,70,WHITE,True)
    tx(d,'YOU SIGN',76,400,89,CYAN,True)
    rows=[('01','MODEL COST',CYAN),('02','HUMAN REVIEW',GOLD),('03','REWORK',CORAL),('04','INFRASTRUCTURE',CYAN),('05','SECURITY + QUALITY',LIME)]
    for i,(num,name,col) in enumerate(rows):
        y=608+i*172
        box(d,(78,y,987,y+150),fill=PANEL,stroke=col,r=24,width=4)
        tx(d,num,110,y+35,58,col,True)
        tx(d,name,246,y+51,40,WHITE,True,max_width=700)
    center(d,'ROI ALSO NEEDS VALUE DELIVERED',1690,27,GOLD)

def scene_close(d):
    tx(d,'TEST BEFORE',78,390,83,WHITE,True)
    tx(d,'YOU SIGN.',78,510,100,CYAN,True)
    box(d,(78,760,987,1180),fill=(23,54,58),stroke=LIME,width=5)
    center(d,'COST PER',826,69,WHITE)
    center(d,'ACCEPTED RESULT',938,59,LIME)
    tx(d,'PrismBay AI',79,1220,62,WHITE,True)
    tx(d,'Practical AI business systems',79,1325,37,MUTED)
    tx(d,'for founders and executives.',79,1385,35,MUTED)

def render_frame_unit_economics(segment,index,total,source):
    if total != 7:
        raise ValueError('Unit-economics treatment requires seven distinct scenes')
    scene=segment.get('scene')
    expected=['hook','formula','option_a','option_b','compare','pilot','close']
    if scene != expected[index]:
        raise ValueError(f'Expected scene {expected[index]} at position {index}, got {scene}')
    im,d=base('BUSINESS AI  /  COST PER ACCEPTED RESULT',index,total)
    if scene=='hook': scene_hook(d)
    elif scene=='formula': scene_formula(d)
    elif scene=='option_a': scene_option(d,'OPTION A','$0.10','700','$390',[100,200,90],'$0.56',CORAL)
    elif scene=='option_b': scene_option(d,'OPTION B','$0.25','900','$430',[250,150,30],'$0.48',CYAN)
    elif scene=='compare': scene_compare(d)
    elif scene=='pilot': scene_pilot(d)
    else: scene_close(d)
    return im
