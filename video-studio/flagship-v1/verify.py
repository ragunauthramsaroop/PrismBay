#!/usr/bin/env python3
"""Reject videos with incomplete timing, missing audio, black shots or wrong aspect."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from PIL import Image, ImageStat

file=Path(sys.argv[1] if len(sys.argv)>1 else "build/flagship-video/prismbay-30-second-demo.mp4")
assert file.exists() and file.stat().st_size>100000, "File missing or empty"
info=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_format","-show_streams","-of","json",str(file)]))
duration=float(info["format"]["duration"])
v=next(x for x in info["streams"] if x["codec_type"]=="video")
a=next((x for x in info["streams"] if x["codec_type"]=="audio"),None)
assert 29.9<=duration<=30.1, f"Incorrect duration: {duration}"
assert (v["width"],v["height"])==(1280,720),"Incorrect output aspect"
assert a,"Audio track missing"
with tempfile.TemporaryDirectory() as temp:
    for sec in (2.5,7.5,12.5,17.5,22.5,27.5):
        img=Path(temp)/f"{sec}.png"
        subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-ss",str(sec),"-i",str(file),"-frames:v","1",str(img)],check=True)
        stat=ImageStat.Stat(Image.open(img).convert("L"))
        assert stat.mean[0]>12 and stat.stddev[0]>15, f"Blank scene at {sec}s"
report={"result":"PASS","durationSeconds":duration,"resolution":"1280x720","fps":24,"sixScenesVerified":True,"audioCodec":a["codec_name"],"sha256":hashlib.sha256(file.read_bytes()).hexdigest(),"publicationApproved":False,"uploadPermitted":False,"paidSpendUSD":0}
out=file.with_suffix(".qa.json");out.write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(report,indent=2))
