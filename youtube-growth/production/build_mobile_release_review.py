#!/usr/bin/env python3
"""Offline review page for the original unpublished PrismBay AI Short."""
import json
from pathlib import Path
from html import escape

root = Path("out/youtube/accepted-output-short")
manifest = json.loads((root / "manifest.json").read_text())
assert manifest["channelId"] == "UCw2hs85TzIpdKwJtG-BSxzQ"
assert manifest["publicationApproved"] is False and manifest["uploadPermitted"] is False
assert (root / "prismbay-ai-accepted-output-cost-short-review.mp4").stat().st_size > 100000
blocks = (root / "captions-phrase-synchronous.srt").read_text().strip().split("\n\n")
assert len(blocks) == manifest["narrationSegments"] == 12
cues = []
for block in blocks:
    lines = block.splitlines()
    start = lines[1].split(" --> ")[0]
    cues.append((start, " ".join(lines[2:])))
transcript = "\n".join(f"<li><time>{escape(t)}</time> {escape(s)}</li>" for t,s in cues)
html = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>PrismBay AI | Private mobile release review</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#081b2b;color:#f1f8fa;font:16px/1.5 system-ui,Arial,sans-serif}
main{max-width:900px;margin:auto;padding:16px}h1{font-size:1.4rem}h2{font-size:1.1rem}
.warning{background:#55341b;border-left:5px solid #f2b24e;padding:12px;border-radius:6px}
video{display:block;width:min(100%,390px);max-height:78vh;aspect-ratio:9/16;margin:18px auto;background:#000;border:1px solid #2bd4c8}
.card{background:#123449;border:1px solid #286277;padding:14px;border-radius:12px;margin:16px 0}
label{display:block;padding:9px 0}input{width:20px;height:20px;vertical-align:middle;margin-right:8px}
button{padding:12px 16px;background:#2bd4c8;color:#062034;border:0;border-radius:8px;font-weight:700}
button:disabled{opacity:.4}ol{padding-left:23px}li{margin:8px 0}time{color:#8ddbd6}
small{color:#b5d0d7}code{word-break:break-all}
</style></head><body><main>
<h1>PrismBay AI | Private release review</h1>
<p class="warning">NOT PUBLISHED. Review on a physical phone with headphones. This offline page never uploads media or approves publication.</p>
<p>Channel: <strong>@PrismBayAI</strong> (UCw2hs85TzIpdKwJtG-BSxzQ). Duration: __DURATION__ seconds. All numbers are illustrative.</p>
<video controls playsinline preload="metadata" src="../prismbay-ai-accepted-output-cost-short-review.mp4" aria-label="Unpublished PrismBay AI Short"></video>
<div class="card"><h2>Release gates</h2>
<label><input type="checkbox" class="gate" id="listen"> Complete narration listened to, including every spoken number.</label>
<label><input type="checkbox" class="gate" id="mobile"> Entire video played on a physical mobile device.</label>
<label><input type="checkbox" class="gate" id="ui"> Captions and text clear of actual Shorts controls.</label>
<label><input type="checkbox" class="gate" id="rights"> Voice provenance and original-content rights reviewed.</label>
<label><input type="checkbox" class="gate" id="editorial"> Final factual and editorial presentation approved.</label>
<p><button id="copy" disabled>Copy review record</button></p>
<small>Local browser checklist only. No publication follows from checking boxes. Record approval separately.</small>
</div><div class="card"><h2>Exact narration and caption starts</h2><ol>__TRANSCRIPT__</ol></div>
<div class="card"><h2>Production evidence</h2><p>Video SHA-256: <code>__SHA__</code></p>
<p>Hypothetical: $40 tools + $60 human review = $100. Divide by 80 accepted results for $1.25 per accepted outcome.</p>
<p>Zero paid spend. Review-only until the separate authorized release workflow records approval.</p></div>
</main><script>
const boxes=[...document.querySelectorAll('.gate')],button=document.getElementById('copy');
function sync(){button.disabled=!boxes.every(x=>x.checked);}
boxes.forEach(b=>{try{b.checked=localStorage.getItem('prismbay-'+b.id)==='true'}catch(e){}b.addEventListener('change',()=>{try{localStorage.setItem('prismbay-'+b.id,String(b.checked))}catch(e){}sync()})});sync();
button.addEventListener('click',async()=>{const result='PrismBay AI: 5 review gates checked on device. Channel UCw2hs85TzIpdKwJtG-BSxzQ. Video SHA-256 __SHA__. This record is not upload authorization.';try{await navigator.clipboard.writeText(result);button.textContent='Copied'}catch(e){window.prompt('Copy review record:',result)}});
</script></body></html>"""
html = html.replace("__DURATION__", str(manifest["durationSeconds"])).replace("__TRANSCRIPT__", transcript).replace("__SHA__", escape(manifest["videoSha256"]))
review = root / "release-review-pack"
review.mkdir(exist_ok=True)
page = review / "mobile-release-review.html"
page.write_text(html, encoding="utf-8")
assert html.count("<li>") == 12
assert "<video controls playsinline" in html
print("Offline mobile review page:", page, page.stat().st_size, "bytes")
