const PRISMBAY_AUTH_KEY='prismbayEbayAuth';
const PRISMBAY_AUTH_MAX_IDLE=60*60*1000;
function pnorm(v){return String(v||'').replace(/\s+/g,' ').trim().toLowerCase();}
async function getPrismBayAuth(){const o=await chrome.storage.local.get(PRISMBAY_AUTH_KEY);const s=o[PRISMBAY_AUTH_KEY];if(!s?.active)return null;const last=Number(s.updatedAt||s.startedAt||0);if(Date.now()-last>PRISMBAY_AUTH_MAX_IDLE){await chrome.storage.local.set({[PRISMBAY_AUTH_KEY]:{...s,active:false,phase:'expired',status:'Authorization session expired after 60 minutes without progress. Start it again from the PrismBay extension.'}});return null;}return s;}
async function patchPrismBayAuth(patch){const o=await chrome.storage.local.get(PRISMBAY_AUTH_KEY);const s=o[PRISMBAY_AUTH_KEY]||{};await chrome.storage.local.set({[PRISMBAY_AUTH_KEY]:{...s,...patch,updatedAt:Date.now()}});}
function detectSignedInEbayIds(){const out=[];for(const a of document.querySelectorAll('a[href*="/usr/"]')){try{const m=new URL(a.href,location.href).pathname.match(/\/usr\/([^/?#]+)/i);if(m)out.push(decodeURIComponent(m[1]));}catch{}}
const ug=document.querySelector('#gh-ug,[data-testid*="user" i],[aria-label*="account" i]');if(ug){const t=String(ug.textContent||'').replace(/^hi[!,\s]*/i,'').replace(/[!\s]+$/,'').trim();if(t&&!/sign in|register/i.test(t))out.push(t);}return [...new Set(out.map(v=>String(v).trim()).filter(Boolean))];}
async function runPrismBayEbayAuth(){const s=await getPrismBayAuth();if(!s)return;const expected=pnorm(s.userId);
if(s.phase==='verify_ebay_account'){
  const body=pnorm(document.body?.innerText);
  const ids=detectSignedInEbayIds();
  const match=ids.find(v=>pnorm(v)===expected);
  if(match){await patchPrismBayAuth({phase:'cj_connect',verifiedEbayId:match,status:`Verified signed-in eBay account ${match}. Opening CJ authorization…`});location.replace('https://cjdropshipping.com/');return;}
  const other=ids.find(v=>pnorm(v)!==expected);
  if(other){await patchPrismBayAuth({active:false,phase:'blocked_account_mismatch',status:`Blocked: signed-in eBay account appears to be ${other}, expected ${s.userId}.`});return;}
  if(/sign in|register/.test(body)){await patchPrismBayAuth({status:`Sign in to eBay as ${s.userId}. The agent will continue automatically after sign-in.`});}
  return;
}
if(s.phase==='ebay_consent'){
  const body=pnorm(document.body?.innerText);
  if(/security code|verification code|verify your identity|captcha/.test(body)){await patchPrismBayAuth({status:'Complete eBay verification/CAPTCHA in this tab. The agent will continue afterward.'});return;}
  if(/cjdropshipping|cj dropshipping/.test(body)){
    await patchPrismBayAuth({status:'CJ authorization is ready on eBay. Review the permissions and click eBay’s “I agree” button. The agent will verify the connection after eBay returns to CJ.'});
  } else if(/sign in/.test(body)) {
    await patchPrismBayAuth({status:`Sign in to eBay as ${s.userId}. The agent will continue to the CJ permission screen.`});
  }
}
}
setInterval(()=>{runPrismBayEbayAuth().catch(()=>{});},1200);
runPrismBayEbayAuth().catch(()=>{});
