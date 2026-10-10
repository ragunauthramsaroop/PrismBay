import fs from 'node:fs/promises';

const API='https://api.ebay.com';
const INVENTORY=`${API}/sell/inventory/v1`;
const TOKEN=`${API}/identity/v1/oauth2/token`;
const MANIFEST='marketplaces/ebay/garment-steamer.json';
const CONTROL='growth-reports/ebay/control-plane.json';
const OUT='growth-reports/ebay/ebay-api-result.json';
const IMAGE='https://oss-cf.cjdropshipping.com/product/2024/10/02/08/9b378db0-cb12-4b24-85d4-d3bd42e2649d.jpg';

function val(n){return String(process.env[n]??'').trim()}
function required(names){const m=names.filter(n=>!val(n));if(m.length)throw new Error(`missing_env:${m.join(',')}`)}
async function json(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});const text=await r.text();let data={};if(text){try{data=JSON.parse(text)}catch{data={raw:text.slice(0,500)}}}if(!r.ok)throw new Error(`ebay_${r.status}_${JSON.stringify(data).slice(0,700)}`);return data}
async function accessToken(){required(['EBAY_CLIENT_ID','EBAY_CLIENT_SECRET','EBAY_REFRESH_TOKEN']);const basic=Buffer.from(`${val('EBAY_CLIENT_ID')}:${val('EBAY_CLIENT_SECRET')}`).toString('base64');const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:val('EBAY_REFRESH_TOKEN'),scope:'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account'});const d=await json(TOKEN,{method:'POST',headers:{authorization:`Basic ${basic}`,'content-type':'application/x-www-form-urlencoded'},body});if(!d.access_token)throw new Error('missing_access_token');console.log(`::add-mask::${d.access_token}`);return d.access_token}
async function ebay(url,token,options={}){return json(url,{...options,headers:{authorization:`Bearer ${token}`,'content-type':'application/json','content-language':'en-US',...(options.headers||{})}})}

async function main(){
  await fs.mkdir('growth-reports/ebay',{recursive:true});
  const m=JSON.parse(await fs.readFile(MANIFEST,'utf8'));
  const c=JSON.parse(await fs.readFile(CONTROL,'utf8'));
  const names=['EBAY_CLIENT_ID','EBAY_CLIENT_SECRET','EBAY_REFRESH_TOKEN','EBAY_PAYMENT_POLICY_ID','EBAY_RETURN_POLICY_ID','EBAY_FULFILLMENT_POLICY_ID','EBAY_MERCHANT_LOCATION_KEY'];
  const missing=names.filter(n=>!val(n));
  if(c.readyForBrowserPublish!==true){const r={status:'blocked',reason:'control_plane_not_ready',blockers:Object.entries(c.gates||{}).filter(([,v])=>v!==true).map(([k])=>k),checkedAt:new Date().toISOString()};await fs.writeFile(OUT,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));return;}
  if(missing.length){const r={status:'dormant',reason:'ebay_credentials_or_policy_ids_missing',missing,checkedAt:new Date().toISOString()};await fs.writeFile(OUT,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));return;}
  const token=await accessToken();
  const sku=m.product.supplier.variantSku;
  const aspects=Object.fromEntries(Object.entries(m.product.itemSpecifics||{}).map(([k,v])=>[k,[String(v)]]));
  const item={availability:{shipToLocationAvailability:{quantity:Number(m.offer.quantity||1)}},condition:'NEW',product:{title:m.product.title,description:m.product.description,aspects,brand:m.product.brand,imageUrls:[IMAGE]}};
  await ebay(`${INVENTORY}/inventory_item/${encodeURIComponent(sku)}`,token,{method:'PUT',body:JSON.stringify(item)});
  const offers=await ebay(`${INVENTORY}/offer?sku=${encodeURIComponent(sku)}`,token);
  const list=Array.isArray(offers?.offers)?offers.offers:[];
  const same=list.find(o=>String(o.marketplaceId||'')==='EBAY_US')||list[0]||null;
  if(same?.status==='PUBLISHED'||same?.listing?.listingId){const r={status:'already_published',offerId:same.offerId,listingId:same?.listing?.listingId||null,checkedAt:new Date().toISOString()};await fs.writeFile(OUT,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));return;}
  const offer={sku,marketplaceId:'EBAY_US',format:'FIXED_PRICE',availableQuantity:Number(m.offer.quantity||1),categoryId:m.product.categoryId,merchantLocationKey:val('EBAY_MERCHANT_LOCATION_KEY'),listingDescription:m.product.description,listingDuration:'GTC',listingPolicies:{paymentPolicyId:val('EBAY_PAYMENT_POLICY_ID'),returnPolicyId:val('EBAY_RETURN_POLICY_ID'),fulfillmentPolicyId:val('EBAY_FULFILLMENT_POLICY_ID')},pricingSummary:{price:{currency:'USD',value:Number(m.offer.price).toFixed(2)}},includeCatalogProductDetails:false};
  let offerId=same?.offerId||null;
  if(offerId){await ebay(`${INVENTORY}/offer/${encodeURIComponent(offerId)}`,token,{method:'PUT',body:JSON.stringify(offer)});}else{const created=await ebay(`${INVENTORY}/offer`,token,{method:'POST',body:JSON.stringify(offer)});offerId=created.offerId;}
  if(!offerId)throw new Error('offer_id_missing');
  if(val('EBAY_AUTOPUBLISH')!=='1'){const r={status:'offer_prepared',offerId,published:false,checkedAt:new Date().toISOString()};await fs.writeFile(OUT,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));return;}
  const published=await ebay(`${INVENTORY}/offer/${encodeURIComponent(offerId)}/publish`,token,{method:'POST',body:'{}'});
  const r={status:'published',offerId,listingId:published?.listingId||null,published:true,checkedAt:new Date().toISOString()};
  await fs.writeFile(OUT,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));
}
main().catch(async e=>{const r={status:'error',error:String(e?.message||e).slice(0,900),checkedAt:new Date().toISOString()};try{await fs.mkdir('growth-reports/ebay',{recursive:true});await fs.writeFile(OUT,JSON.stringify(r,null,2)+'\n')}catch{}console.error(e?.stack||e);process.exit(1)});
