#!/usr/bin/env python3
"""Render a *working* spreadsheet-style illustrative demo, never a static web-page card.
Recorded as actual Chromium interactions on GitHub Actions; no footage of a paid workbook is implied.
No posting, no paid media, no manufactured buyers or testimonials.
"""
from __future__ import annotations
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import wave
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "build/tiktok-repairs/stakeholder"
W, H = 540, 960
APP = r"""<!doctype html>
<html lang="en">
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Illustrative Stakeholder Commitment Register - PrismBay</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#eef2f1;color:#12332c;font:17px system-ui,Arial,sans-serif}
#app{width:540px;height:960px;overflow:hidden;position:relative;background:linear-gradient(#fcfefa,#ecf3ef)}
.top{background:#073b32;color:#fff;padding:30px 28px 25px}
.brand{letter-spacing:3px;font-weight:850;font-size:13px;color:#b9f7d2}
.top h1{font-size:38px;line-height:1.08;margin:22px 0 8px;letter-spacing:-1.7px}
.tagline{font-size:18px;color:#e2eee7;margin:0}
.disclosure{margin-top:16px;font-size:11px;letter-spacing:.4px;color:#ffe3ae;font-weight:750}
main{padding:26px 24px}.hook{border-left:5px solid #20956c;background:white;padding:17px 17px;min-height:97px;border-radius:4px 18px 18px 4px;
font-weight:850;font-size:26px;line-height:1.1;letter-spacing:-1px;margin-bottom:20px;transition:background .4s, transform .4s}
.section{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px}
.eyebrow{font-size:13px;letter-spacing:1px;font-weight:800;color:#577b6a}
button{border:0;border-radius:11px;padding:13px 17px;background:#057653;color:#fff;font:800 16px system-ui;box-shadow:0 5px 9px #0a413323;cursor:pointer}
table{border-collapse:collapse;background:#fff;width:100%;font-size:15px;border-radius:12px;overflow:hidden;box-shadow:0 8px 22px #12362d18}
th{background:#dbe9e1;text-align:left;font-size:11px;letter-spacing:.5px;padding:12px 11px;color:#456e5a}
td{border-bottom:1px solid #e0e8e2;padding:14px 11px;vertical-align:top;line-height:1.25}
td b{font-size:15px}.badge{font-size:11px;display:inline-block;border-radius:30px;background:#fff0d0;color:#7c4a00;padding:6px 8px;font-weight:800;white-space:nowrap}
.completed{background:#d8f3e0;color:#166c3e}
.form{margin-top:13px;background:white;border-radius:15px;padding:18px;box-shadow:0 6px 25px #12362d1a;display:none}
.form.visible{display:block}
label{display:block;font-size:13px;font-weight:800;color:#47685a;margin:11px 0 6px}
input,select{width:100%;border:2px solid #cadaac;border-radius:8px;padding:12px;font:16px system-ui;outline-color:#00a96c}
.form button{width:100%;margin-top:16px}
.metric{display:flex;gap:8px;justify-content:space-between;margin-top:20px}
.metric>div{width:31%;background:#fff;padding:13px 9px;border-radius:10px;text-align:center;box-shadow:0 4px 15px #103d3113}
.metric strong{display:block;font-size:31px}.metric span{font-size:12px;color:#587769;font-weight:750}
.footer{position:absolute;bottom:0;left:0;right:0;background:#093c34;color:#fff;padding:20px 25px 23px;display:flex;align-items:center;justify-content:space-between}
.footer b{font-size:19px}.footer small{display:block;color:#c8e6d7;font-size:12px;margin-top:3px}
#progress{height:5px;background:#17624e;position:absolute;bottom:0;left:0;right:0}
#fill{height:100%;width:0%;background:#b0f8ca;transition:width .65s}
#flash{pointer-events:none;position:absolute;top:0;left:0;right:0;height:960px;background:#d9ffcf;opacity:0;transition:opacity .3s}
</style>
<div id="app">
  <div class="top">
    <div class="brand">PRISMBAY  /  WORKFLOW EXAMPLE</div>
    <h1>Who owns<br>the promise?</h1>
    <p class="tagline">From meeting note to verified closure.</p>
    <p class="disclosure">ILLUSTRATIVE CSV WORKFLOW • NOT PAID TOOLKIT SOFTWARE</p>
  </div>
  <main>
    <div id="hook" class="hook">A meeting ended.<br>But who is following up?</div>
    <div class="section">
      <span class="eyebrow">COMMITMENTS REGISTER</span>
      <button id="new">+ Add action</button>
    </div>
    <table><thead><tr><th>COMMITMENT / OWNER</th><th>DUE</th><th>STATUS</th></tr></thead>
    <tbody>
      <tr><td><b>Share project update</b><br><small>Jordan • Demo example</small></td><td>Nov 03</td><td><span class="badge">OPEN</span></td></tr>
      <tr id="fresh" style="display:none"><td><b id="saved-action"></b><br><small id="saved-owner"></small></td><td id="saved-due"></td><td><span class="badge" id="status">OPEN</span></td></tr>
    </tbody></table>
    <div id="form" class="form">
      <label for="action">What was agreed?</label>
      <input id="action" placeholder="An exact, testable action">
      <label for="owner">Who owns the follow-up?</label>
      <select id="owner"><option value="">Select an owner</option><option>Alex R. (sample)</option><option>Jordan T. (sample)</option></select>
      <label for="due">Due date</label><input id="due" type="date" value="2026-11-06">
      <button id="save">Save commitment</button>
    </div>
    <div id="closure" class="form">
      <label for="evidence">What is the closure evidence?</label>
      <input id="evidence" placeholder="Example: photograph, signed record">
      <button id="complete">Mark verified complete</button>
    </div>
    <div class="metric"><div><strong id="count">1</strong><span>TRACKED</span></div>
      <div><strong id="open">1</strong><span>OPEN</span></div><div><strong id="done">0</strong><span>VERIFIED</span></div></div>
  </main>
  <div class="footer">
    <div><b>Free starter CSV</b><small>Optional $49 editable document pack</small></div>
    <div style="font-size:14px;font-weight:800">PRISMBAY</div>
  </div>
  <div id="progress"><div id="fill"></div></div><div id="flash"></div>
</div>
<script>
const $ = selector => document.querySelector(selector);
function cue(line,p){ $('#hook').innerHTML=line;$('#fill').style.width=(p*100)+'%'; }
$('#new').onclick=()=>{$('#form').classList.add('visible');$('table').style.display='none';$('.metric').style.display='none';cue('Capture the <em>actual</em> promise.',.20);}
$('#save').onclick=()=>{
  if(!$('#action').value.trim()||!$('#owner').value)return;
  $('#saved-action').textContent=$('#action').value;
  $('#saved-owner').textContent=$('#owner').value;
  $('#saved-due').textContent='Nov 06';
  $('#fresh').style.display='table-row';
  $('#form').classList.remove('visible');
  $('table').style.display='table';$('.metric').style.display='flex';
  $('#count').textContent='2';$('#open').textContent='2';
  cue('An owner. A date.<br>A visible next action.',.58);
  $('#closure').classList.add('visible');
};
$('#complete').onclick=()=>{
 if(!$('#evidence').value.trim())return;
 $('#status').textContent='VERIFIED';$('#status').classList.add('completed');
 $('#open').textContent='1';$('#done').textContent='1';
 $('#closure').classList.remove('visible');
 cue('Evidence attached.<br>Commitment closed.',.92);
};
</script></html>"""

def audio(path,seconds=25, rate=22050):
    with wave.open(str(path),"wb") as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        pcm=array.array("h")
        for i in range(int(seconds*rate)):
            t=i/rate;beat=(t*2.1)%1
            kick=math.sin(2*math.pi*(53+60*math.exp(-beat*20))*t)*math.exp(-beat*21)
            note=math.sin(2*math.pi*(220 if int(t*2.1)%4<2 else 196)*t)*math.exp(-beat*12)
            env=max(0,min(1,t/.5,(seconds-t)/.6))
            pcm.append(int(max(-1,min(1,.08*kick+.013*note))*env*32767))
        f.writeframes(pcm.tobytes())

def cmd(args):
    p=subprocess.run(args,capture_output=True,text=True,check=False)
    if p.returncode:raise RuntimeError("external_command_failed: "+p.stderr[-2000:])
    return p.stdout

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    app=OUT/"illustrative-commitment-workflow.html"
    app.write_text(APP,encoding="utf-8")
    audio_track=OUT/"original-ambient.wav"
    audio(audio_track)
    raw=OUT/"recordings"
    raw.mkdir(exist_ok=True)
    screenshots=OUT/"review-stills";screenshots.mkdir(exist_ok=True)
    timeline=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--no-sandbox"])
        ctx=browser.new_context(viewport={"width":W,"height":H},device_scale_factor=1,
                                record_video_dir=str(raw),record_video_size={"width":W,"height":H},
                                reduced_motion="no-preference")
        page=ctx.new_page()
        page.goto(app.resolve().as_uri())
        page.wait_for_timeout(1500)
        page.screenshot(path=str(screenshots/"01-hook.png"))
        timeline.append("Hook: sample workflow and editability disclosure")
        page.locator("#new").click()
        page.wait_for_timeout(1000)
        page.locator("#action").press_sequentially("Confirm drainage follow-up",delay=68)
        page.wait_for_timeout(350)
        page.locator("#owner").select_option(label="Alex R. (sample)")
        page.wait_for_timeout(650)
        page.locator("#due").fill("2026-11-06")
        page.wait_for_timeout(700)
        page.screenshot(path=str(screenshots/"02-enter-commitment.png"))
        timeline.append("Actual typed entry: action, owner, deadline")
        page.locator("#save").click()
        page.wait_for_timeout(1500)
        page.screenshot(path=str(screenshots/"03-saved-register.png"))
        timeline.append("Save action into working register and track it")
        page.locator("#evidence").press_sequentially("Inspection record filed",delay=65)
        page.wait_for_timeout(850)
        page.screenshot(path=str(screenshots/"04-evidence.png"))
        timeline.append("Type evidence, not an unsupported performance claim")
        page.locator("#complete").click()
        page.wait_for_timeout(2400)
        page.screenshot(path=str(screenshots/"05-verified.png"))
        timeline.append("Verified result: one open, one closed, data visibly changes")
        video=page.video
        ctx.close()
        video_path=Path(video.path())
        browser.close()
    mp4=OUT/"stakeholder-active-workflow-review.mp4"
    cmd(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(video_path),
         "-i",str(audio_track),"-vf","scale=1080:1920:flags=lanczos,fps=30,format=yuv420p",
         "-c:v","libx264","-preset","veryfast","-crf","22","-c:a","aac",
         "-b:a","96k","-movflags","+faststart","-shortest",str(mp4)])
    p=json.loads(cmd(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(mp4)]))
    stream=next((x for x in p["streams"] if x["codec_type"]=="video"),{})
    duration=float(p["format"]["duration"])
    if stream.get("codec_name")!="h264" or stream.get("width")!=1080 or stream.get("height")!=1920 or not 12<=duration<=28 or mp4.stat().st_size<250000:
        raise ValueError("REVIEW_FAIL_unusable_recording")
    report={"status":"RENDERED_EDITORIAL_DRAFT_NO_TIKTOK_POST","file":mp4.name,"durationSeconds":duration,
            "resolution":"1080x1920","source":"actual browser interactions in original demonstration interface",
            "disclosure":"Illustrative CSV workflow, NOT footage of the $49 paid toolkit itself",
            "actions":timeline,"reviewScreenshots":[x.name for x in sorted(screenshots.glob("*.png"))],
            "sha256":hashlib.sha256(mp4.read_bytes()).hexdigest(),
            "buyerClaimsApproved":False,"actualPaidWorkbookShown":False,
            "tiktokPublishAuthorized":False,"publishingLocked":True}
    (OUT/"render-report.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report))
if __name__=="__main__":main()
