#!/usr/bin/env python3
from __future__ import annotations
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE='https://clean.prismbayai.com'
PATHS=['/','/shipping.html','/returns.html','/privacy.html','/terms.html','/about.html','/contact.html']
VIEWPORTS={
  'desktop': {'width':1440,'height':1000},
  'mobile': {'width':390,'height':844},
}
EXPECTED_STRIPE={
  'https://buy.stripe.com/cNi5kE8XAeSndGib8QgnK02',
  'https://buy.stripe.com/bJe4gA8XAdOjeKmb8QgnK05',
  'https://buy.stripe.com/7sY5kEehUcKf9q2a4MgnK00',
  'https://buy.stripe.com/bJe00k2zc8tZ7hUgtagnK01',
}
JS=r'''() => {
 const vw=innerWidth;
 const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&+s.opacity!==0&&r.width>1&&r.height>1};
 const sel=e=>e.id?'#'+CSS.escape(e.id):e.tagName.toLowerCase()+(e.classList?.length?'.'+[...e.classList].slice(0,2).map(CSS.escape).join('.'):'');
 const all=[...document.querySelectorAll('body *')].filter(visible);
 const brokenImages=[]; const offscreen=[]; const tiny=[]; const clipped=[];
 for(const e of all){
   const r=e.getBoundingClientRect(),s=getComputedStyle(e);
   if(e.tagName==='IMG'&&e.complete&&e.naturalWidth===0) brokenImages.push({el:sel(e),src:e.getAttribute('src')});
   if(s.position!=='fixed'&&s.position!=='absolute'&&r.right>vw+3) offscreen.push({el:sel(e),right:Math.round(r.right),vw});
   if(innerWidth<=420&&e.matches('a,button,summary,[role=button]')&&(r.height<34||r.width<34)) tiny.push({el:sel(e),w:Math.round(r.width),h:Math.round(r.height)});
   const text=(e.childElementCount===0?e.textContent:'').trim();
   if(text.length>24&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+3&&['hidden','clip'].includes(s.overflowX)) clipped.push({el:sel(e),text:text.slice(0,80)});
 }
 return {
   title:document.title,
   bodyOverflow:document.documentElement.scrollWidth>vw+3,
   brokenImages:brokenImages.slice(0,20),
   offscreen:offscreen.slice(0,20),
   tinyControls:tiny.slice(0,20),
   clippedText:clipped.slice(0,20),
   httpAssets:[...document.querySelectorAll('[src],[href]')].map(e=>e.src||e.href).filter(x=>typeof x==='string'&&x.startsWith('http:')),
   stripeLinks:[...document.querySelectorAll('a[href*="buy.stripe.com"]')].map(a=>a.href),
   localLinks:[...document.querySelectorAll('a[href]')].map(a=>a.href).filter(h=>h.startsWith(location.origin))
 };
}'''

async def audit(strict=True):
  results=[]; errors=[]; warnings=[]
  async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
    context=await browser.new_context(ignore_https_errors=False)
    page=await context.new_page()
    for path in PATHS:
      row={'path':path,'viewports':{}}
      for name,vp in VIEWPORTS.items():
        await page.set_viewport_size(vp)
        try:
          resp=await page.goto(BASE+path,wait_until='domcontentloaded',timeout=30000)
          await page.wait_for_timeout(300)
          status=resp.status if resp else 0
          data=await page.evaluate(JS)
          data['status']=status
          row['viewports'][name]=data
          if status<200 or status>=400: errors.append(f'{path} {name}: HTTP {status}')
          if data['bodyOverflow']: errors.append(f'{path} {name}: horizontal overflow')
          if data['brokenImages']: errors.append(f'{path} {name}: broken images {data["brokenImages"][:3]}')
          if data['httpAssets']: errors.append(f'{path} {name}: insecure http assets {data["httpAssets"][:3]}')
          if data['clippedText']: warnings.append(f'{path} {name}: clipped text {data["clippedText"][:3]}')
          if data['offscreen']: warnings.append(f'{path} {name}: offscreen elements {data["offscreen"][:3]}')
          if data['tinyControls']: warnings.append(f'{path} {name}: small controls {data["tinyControls"][:3]}')
          if path=='/' and name=='desktop':
            found=set(data['stripeLinks'])
            missing=EXPECTED_STRIPE-found
            unexpected={x for x in found if x not in EXPECTED_STRIPE}
            if missing: errors.append(f'/: missing expected Stripe links {sorted(missing)}')
            if unexpected: warnings.append(f'/: unexpected Stripe links {sorted(unexpected)}')
        except Exception as exc:
          errors.append(f'{path} {name}: {type(exc).__name__}: {exc}')
      results.append(row)
    await context.close(); await browser.close()
  report={'base':BASE,'summary':{'pages':len(PATHS),'viewports':list(VIEWPORTS),'errors':len(errors),'warnings':len(warnings)},'errors':errors,'warnings':warnings,'results':results}
  out=Path('audit'); out.mkdir(exist_ok=True)
  (out/'prismbay-live-storefront-audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
  print('PRISMBAY_LIVE_AUDIT',json.dumps(report['summary']))
  for e in errors: print('ERROR',e)
  for w in warnings: print('WARN',w)
  return 1 if strict and errors else 0

if __name__=='__main__':
  raise SystemExit(asyncio.run(audit(strict='--non-strict' not in sys.argv)))
