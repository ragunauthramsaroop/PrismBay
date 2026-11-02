#!/usr/bin/env python3
"""Read-only mobile browser smoke test. pip install playwright; Chromium required.
Tests decode, play, seek, and captures contain/cover viewport screenshots.
A technical PASS is never editorial, rights, audio, or publication approval.
"""
import argparse, asyncio, base64, json
from pathlib import Path
from playwright.async_api import async_playwright

async def test_video(path, chromium, out):
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=chromium, headless=True,
            args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
        page = await browser.new_page(viewport={"width":390,"height":844},
            device_scale_factor=2, is_mobile=True, has_touch=True)
        errors=[]
        page.on("pageerror", lambda e: errors.append(str(e)))
        data=base64.b64encode(path.read_bytes()).decode()
        await page.set_content('<html><body style="margin:0;background:black"><video playsinline muted preload="auto" src="data:video/mp4;base64,'+data+'"></video></body></html>')
        video=page.locator("video")
        await page.wait_for_function("() => document.querySelector('video').readyState>=1",timeout=20000)
        await video.evaluate("v=>{v.muted=true;v.controls=false;v.style.cssText='width:100vw;height:100vh;object-fit:contain;position:fixed;left:0;top:0;background:black'}")
        info=await video.evaluate("v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,error:v.error?.message||null})")
        try:await video.evaluate("v=>v.play()")
        except Exception as e:errors.append(str(e))
        await page.wait_for_timeout(1400)
        progressed=await video.evaluate("v=>v.currentTime")
        out.mkdir(parents=True,exist_ok=True)
        await page.screenshot(path=str(out/(path.stem+"-contain.png")))
        await video.evaluate("v=>{v.pause();v.currentTime=v.duration*.75}")
        await page.wait_for_timeout(1000)
        seek=await video.evaluate("v=>({time:v.currentTime,error:v.error?.message||null})")
        await page.screenshot(path=str(out/(path.stem+"-seek.png")))
        await video.evaluate("v=>{v.currentTime=.6;v.style.objectFit='cover'}")
        await page.wait_for_timeout(700)
        await page.screenshot(path=str(out/(path.stem+"-cover-crop-stress.png")))
        await browser.close()
        crop=max(0,(info["width"]-info["height"]*390/844)/2)
        ok=(info["width"]==1080 and info["height"]==1920 and info["duration"]>5
            and progressed>.2 and seek["time"]>2 and not info["error"]
            and not seek["error"] and not errors)
        return {"file":path.name,"technical_pass":bool(ok),"metadata":info,
                "playback_seconds":progressed,"seek":seek,"errors":errors,
                "cover_crop_source_pixels_each_side":round(crop,1),
                "editorial_cover_crop_review":"REQUIRED",
                "limitations":"Muted browser emulation, not narration listening or physical mobile YouTube playback."}

async def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("videos",nargs="+",type=Path)
    ap.add_argument("--chromium",default="/usr/bin/chromium")
    ap.add_argument("--output",type=Path,default=Path("mobile-playback-results.json"))
    a=ap.parse_args()
    rows=[]
    for path in a.videos:
        try:rows.append(await test_video(path,a.chromium,a.output.parent))
        except Exception as e:rows.append({"file":path.name,"technical_pass":False,"error":str(e)})
    report={"channel_id":"UCw2hs85TzIpdKwJtG-BSxzQ",
            "technical_all_pass":all(x["technical_pass"] for x in rows),"results":rows,
            "publication_approved":False}
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    return 0 if report["technical_all_pass"] else 1

if __name__=="__main__":
    raise SystemExit(asyncio.run(main()))
