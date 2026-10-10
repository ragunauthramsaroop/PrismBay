const CONTROL_URL = 'https://clean.prismbayai.com/marketplace/ebay/control-plane.json';
const LISTING_URL = 'https://clean.prismbayai.com/marketplace/ebay/garment-steamer.json';

const state = document.getElementById('state');
const openBtn = document.getElementById('open');
const fillBtn = document.getElementById('fill');
const publishBtn = document.getElementById('publish');
let control = null;
let listing = null;

function esc(v){ return String(v ?? '').replace(/[<>&]/g, ''); }

function render() {
  const gates = control?.gates || {};
  const ready = control?.readyForBrowserPublish === true;
  const lines = [
    ['eBay authorization', gates.ebaySellerAuthenticated],
    ['CJ live stock', gates.liveStockVerified],
    ['Dispatch location', gates.dispatchLocationVerified],
    ['Off-eBay checkout absent', gates.directStripeAbsent],
    ['Auto supplier order disabled', gates.automaticSupplierOrderingDisabled],
  ];
  state.innerHTML = lines.map(([label, ok]) => `<div class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✕'} ${esc(label)}</div>`).join('') +
    `<div class="small">Checked ${esc(control?.checkedAt || 'unknown')}</div>`;
  publishBtn.disabled = !ready;
}

async function loadState() {
  try {
    const [c, l] = await Promise.all([
      fetch(`${CONTROL_URL}?t=${Date.now()}`, {cache:'no-store'}),
      fetch(`${LISTING_URL}?t=${Date.now()}`, {cache:'no-store'}),
    ]);
    if (!c.ok || !l.ok) throw new Error('state unavailable');
    control = await c.json();
    listing = await l.json();
    render();
  } catch (error) {
    state.className = 'status bad';
    state.textContent = 'Verified marketplace state is unavailable. Publishing is blocked.';
    publishBtn.disabled = true;
  }
}

async function activeEbayTab() {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if (!tab || !/^https:\/\/(www\.)?ebay\.com\//i.test(tab.url || '')) return null;
  return tab;
}

openBtn.addEventListener('click', async () => {
  await chrome.tabs.create({url:'https://www.ebay.com/sl/sell'});
});

fillBtn.addEventListener('click', async () => {
  const tab = await activeEbayTab();
  if (!tab) {
    state.className = 'status bad';
    state.textContent = 'Open the eBay selling/listing page first.';
    return;
  }
  if (!listing || !control) return;
  const response = await chrome.tabs.sendMessage(tab.id, {type:'PRISMBAY_FILL', listing, control});
  state.className = 'status';
  state.textContent = response?.message || 'Draft fill attempted.';
});

publishBtn.addEventListener('click', async () => {
  if (!control?.readyForBrowserPublish) return;
  const tab = await activeEbayTab();
  if (!tab) {
    state.className = 'status bad';
    state.textContent = 'Open the eBay listing page first.';
    return;
  }
  if (!confirm('Publish this eBay listing now? The agent will only click the final eBay submit control if all verified gates remain green and the page shows no visible validation errors.')) return;
  const response = await chrome.tabs.sendMessage(tab.id, {type:'PRISMBAY_PUBLISH', listing, control});
  state.className = 'status';
  state.textContent = response?.message || 'Publish action attempted.';
});

loadState();
