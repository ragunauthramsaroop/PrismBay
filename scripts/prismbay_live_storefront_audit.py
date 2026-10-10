#!/usr/bin/env python3
from __future__ import annotations
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE='https://clean.prismbayai.com'
LIVE='https://browser-worker-production-f5b4.up.railway.app'
PATHS=['/','/garment-steamer/','/shipping.html','/returns.html','/privacy.html','/terms.html','/about.html','/contact.html']
VIEWPORTS={
  'desktop': {'width':1440,'height':1000},
  'mobile': {'width':390,'height':844},
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
   hrefs:[...document.querySelectorAll('a[href]')].map(a=>a.href),
 };
}'''

async def audit(strict=True):
  results=[]; errors=[]; warnings=[]; live_service={}
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
          if path in {'/','/garment-steamer/'} and data['stripeLinks']:
            errors.append(f'{path} {name}: direct Stripe link exposed before buyer-specific verification')
          if path=='/' and name=='desktop':
            if not any(h.startswith(LIVE+'/garment-steamer/') or h.startswith(BASE+'/garment-steamer/') for h in data['hrefs']):
              errors.append('/: no guarded garment-steamer preflight CTA found')
          if path=='/garment-steamer/' and name=='desktop':
            if not any(h.startswith(LIVE+'/garment-steamer/') for h in data['hrefs']):
              errors.append('/garment-steamer/: direct Railway fallback missing')
        except Exception as exc:
          errors.append(f'{path} {name}: {type(exc).__name__}: {exc}')
      results.append(row)

    try:
      health=await context.request.get(LIVE+'/health',timeout=30000)
      health_body=await health.json()
      live_service['healthStatus']=health.status
      live_service['ready']=health_body.get('ready') is True
      live_service['product']=health_body.get('product')
      live_service['automaticSupplierOrdering']=health_body.get('automaticSupplierOrdering')
      if health.status != 200: errors.append(f'Railway health HTTP {health.status}')
      if health_body.get('ready') is not True: errors.append('Railway quote service is not primed/ready')
      if health_body.get('product') != 'garment-steamer': errors.append('Railway quote service product mismatch')
      if health_body.get('automaticSupplierOrdering') is not False: errors.append('Railway automatic supplier ordering guard missing')

      live_page=await page.goto(LIVE+'/garment-steamer/',wait_until='domcontentloaded',timeout=30000)
      live_text=(await page.locator('body').inner_text()).lower()
      live_service['buyerPageStatus']=live_page.status if live_page else 0
      live_service['buyerPageHasProduct']= 'portable garment steamer' in live_text
      if not live_page or live_page.status != 200: errors.append('Railway buyer page is not HTTP 200')
      if 'portable garment steamer' not in live_text: errors.append('Railway buyer page product content missing')
      if 'check availability' not in live_text: errors.append('Railway buyer page live availability CTA missing')
    except Exception as exc:
      errors.append(f'Railway live service audit: {type(exc).__name__}: {exc}')

    await context.close(); await browser.close()
  report={'base':BASE,'liveService':LIVE,'summary':{'pages':len(PATHS),'viewports':list(VIEWPORTS),'errors':len(errors),'warnings':len(warnings)},'liveServiceEvidence':live_service,'errors':errors,'warnings':warnings,'results':results}
  out=Path('audit'); out.mkdir(exist_ok=True)
  (out/'prismbay-live-storefront-audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
  print('PRISMBAY_LIVE_AUDIT',json.dumps(report['summary']))
  print('LIVE_SERVICE',json.dumps(live_service))
  for e in errors: print('ERROR',e)
  for w in warnings: print('WARN',w)
  return 1 if strict and errors else 0

if __name__=='__main__':
  raise SystemExit(asyncio.run(audit(strict='--non-strict' not in sys.argv)))
