const CJ_AUTH_KEY='prismbayEbayAuth';
const CJ_AUTH_MAX_IDLE=60*60*1000;
function cnorm(v){return String(v||'').replace(/\s+/g,' ').trim().toLowerCase();}
function cvisible(el){if(!el)return false;const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';}
async function cget(){const o=await chrome.storage.local.get(CJ_AUTH_KEY);const s=o[CJ_AUTH_KEY];if(!s?.active)return null;const last=Number(s.updatedAt||s.startedAt||0);if(Date.now()-last>CJ_AUTH_MAX_IDLE){await chrome.storage.local.set({[CJ_AUTH_KEY]:{...s,active:false,phase:'expired',status:'Authorization session expired after 60 minutes without progress. Start it again from the PrismBay extension.'}});return null;}return s;}
async function cpatch(patch){const o=await chrome.storage.local.get(CJ_AUTH_KEY);const s=o[CJ_AUTH_KEY]||{};await chrome.storage.local.set({[CJ_AUTH_KEY]:{...s,...patch,updatedAt:Date.now()}});}
function ctext(el){return cnorm(el?.textContent||el?.value||el?.getAttribute?.('aria-label')||'');}
function clickByText(keys){const wanted=keys.map(cnorm);const els=[...document.querySelectorAll('a,button,[role="button"],li,span,div')].filter(cvisible);const exact=els.find(el=>wanted.includes(ctext(el)));if(exact){exact.click();return true;}const contains=els.find(el=>wanted.some(k=>ctext(el).includes(k))&&ctext(el).length<90);if(contains){contains.click();return true;}return false;}
function clickAuthorizationLink(){const a=[...document.querySelectorAll('a[href]')].filter(cvisible).find(el=>/authoriz/i.test(el.href||'')||/authoriz/i.test(ctext(el)));if(a){a.click();return true;}return false;}
function storeNameInput(){const inputs=[...document.querySelectorAll('input')].filter(cvisible);return inputs.find(el=>{const t=cnorm([el.name,el.id,el.placeholder,el.getAttribute('aria-label')].filter(Boolean).join(' '));return /store name|shop name|ebay user|user id/.test(t);})||null;}
function nativeSet(el,value){if(!el)return false;const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');if(d?.set)d.set.call(el,String(value));else el.value=String(value);['input','change','blur'].forEach(t=>el.dispatchEvent(new Event(t,{bubbles:true})));return true;}
function uncheckedAgreement(){return [...document.querySelectorAll('input[type="checkbox"]')].filter(cvisible).find(el=>!el.checked&&/agree|agreement|authorization/.test(cnorm(el.closest('label')?.textContent||el.parentElement?.textContent||'')));}
function connected(body,userId){const u=cnorm(userId);return body.includes(u)&&body.includes('ebay')&&(/authoriz|connected|success|normal|active/.test(body));}
async function runCJAuth(){const s=await cget();if(!s)return;if(!['cj_connect','verify_cj'].includes(s.phase))return;const body=cnorm(document.body?.innerText);
if(connected(body,s.userId)){await cpatch({active:false,phase:'done',status:`CJ now shows eBay store ${s.userId} connected. GitHub control-plane verification will confirm the API state next.`});return;}
if(/log in|sign in/.test(body)&&document.querySelector('input[type="password"]')){await cpatch({status:'Sign in to CJ in this tab. The agent will continue automatically after login.'});return;}
const input=storeNameInput();
if(input){nativeSet(input,s.userId);const agreement=uncheckedAgreement();if(agreement){await cpatch({status:'CJ is ready with the correct eBay User ID. Review and tick the visible Store Authorization Agreement checkbox, then the agent will continue.'});return;}
const launched=clickByText(['authorize','confirm','connect','submit','save']);if(launched){await cpatch({phase:'ebay_consent',status:'CJ sent the authorization request to eBay. Waiting for the eBay permission screen…'});return;}
await cpatch({status:`CJ store name is filled with ${s.userId}. Use CJ’s visible authorization/continue button if it does not proceed automatically.`});return;}
if(clickByText(['add store','add stores','connect store'])){await cpatch({status:'Opening CJ Add Store flow…'});return;}
if(clickByText(['ebay'])){await cpatch({status:'Opening the eBay authorization panel in CJ…'});return;}
if(clickAuthorizationLink()||clickByText(['authorization','my cj'])){await cpatch({status:'Navigating to CJ Authorization…'});return;}
await cpatch({status:'CJ is open. Waiting for the Authorization controls to load…'});
}
setInterval(()=>{runCJAuth().catch(()=>{});},1200);
runCJAuth().catch(()=>{});
