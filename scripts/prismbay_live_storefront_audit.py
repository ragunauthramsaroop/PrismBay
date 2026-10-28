#!/usr/bin/env python3
from __future__ import annotations
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE='https://clean.prismbayai.com'
LIVE='https://prismbay-clean-global.floot.app'
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
          if path=='/garment-steamer/' and data['stripeLinks']:
            errors.append(f'{path} {name}: physical product checkout exposed before buyer-specific verification')
          if path=='/':
            # The executive digital bundle is not a physical supplier offer.
            # Preserve its valid checkout while blocking unapproved home links.
            authorized_digital={'https://buy.stripe.com/eVqfZi5Lo7pV31Ea4MgnK0t'}
            unapproved=[url for url in data['stripeLinks'] if url.split('?',1)[0] not in authorized_digital]
            if unapproved:
              errors.append(f'{path} {name}: unapproved home checkout link {unapproved[:3]}')
          if path=='/' and name=='desktop':
            if not any(h.startswith(BASE+'/garment-steamer/') for h in data['hrefs']):
              errors.append('/: no guarded garment-steamer preflight CTA found')
          if path=='/garment-steamer/' and name=='desktop':
            if not any(h.startswith(LIVE+'/quote') for h in data['hrefs']):
              errors.append('/garment-steamer/: Floot shipping inquiry link missing')
            if any('browser-worker-production-f5b4.up.railway.app' in h for h in data['hrefs']):
              errors.append('/garment-steamer/: retired Railway link still present')
        except Exception as exc:
          errors.append(f'{path} {name}: {type(exc).__name__}: {exc}')
      results.append(row)

    # Current independent Floot service. Keep this QA read-only:
    # no customer data, CJ supplier calls, payment or database writes.
    try:
      live_page=await page.goto(LIVE+'/quote',wait_until='domcontentloaded',timeout=30000)
      # Floot serves a React SPA: document DOMContentLoaded can happen before
      # the customer form renders. Wait for both product copy and CTA.
      await page.wait_for_function("""() => {
        const body = (document.body?.innerText || '').toLowerCase();
        return body.includes('portable garment steamer') &&
          body.includes('request manual review');
      }""", timeout=20000)
      live_text=(await page.locator('body').inner_text()).lower()
      live_service['buyerPageStatus']=live_page.status if live_page else 0
      live_service['buyerPageHasProduct']='portable garment steamer' in live_text
      if not live_page or live_page.status != 200: errors.append('Floot shipping inquiry page is not HTTP 200')
      if 'portable garment steamer' not in live_text: errors.append('Floot inquiry product description missing')
      if 'request manual review' not in live_text: errors.append('Floot inquiry form CTA missing')
      if 'no payment' not in live_text and 'no purchase or charge' not in live_text:
        errors.append('Floot inquiry no-payment disclosure missing')

      # Customer records must never be available without authentication.
      private=await context.request.get(LIVE+'/_api/quote-inbox',timeout=20000)
      live_service['privateInboxHttpStatus']=private.status
      if private.status not in (401,403):
        errors.append(f'Floot private inquiry queue unexpectedly responds HTTP {private.status}')

      # Foreign origin must be denied before any supplier work.
      rejected=await context.request.post(LIVE+'/_api/supplier-preview',
        data='{"json":{"zip":"12"}}',
        headers={'Content-Type':'application/json','Origin':'https://untrusted.example'},
        timeout=20000)
      live_service['foreignOriginHttpStatus']=rejected.status
      if rejected.status != 403:
        errors.append(f'Floot supplier preview accepted foreign Origin (HTTP {rejected.status})')

      live_service['ready']=live_service['buyerPageStatus']==200 and private.status in (401,403) and rejected.status==403
      live_service['product']='garment-steamer'
      live_service['checkoutAuthorizedByAudit']=False
    except Exception as exc:
      errors.append(f'Floot buyer-service audit: {type(exc).__name__}: {exc}')

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
