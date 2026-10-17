import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const LIVE_PI_ID = /^pi_[A-Za-z0-9]+$/;
const LIVE_KEY = /^sk_live_[A-Za-z0-9]+$/;

function money(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

// Only server-side Stripe API responses count. Never trust Stripe-shaped objects in local evidence.
export async function fetchLiveStripePayment(paymentId, {
  stripeKey = process.env.STRIPE_SECRET_KEY,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!LIVE_PI_ID.test(String(paymentId || '')) || !LIVE_KEY.test(String(stripeKey || '')) || typeof fetchImpl !== 'function') return null;
  const get = async path => {
    const response = await fetchImpl(`https://api.stripe.com/v1/${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${stripeKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    return response.json();
  };
  try {
    const intent = await get(`payment_intents/${encodeURIComponent(paymentId)}`);
    if (intent?.id !== paymentId || intent?.livemode !== true ||
        typeof intent?.latest_charge !== 'string' || !/^ch_[A-Za-z0-9]+$/.test(intent.latest_charge)) return null;
    const charge = await get(`charges/${encodeURIComponent(intent.latest_charge)}`);
    if (charge?.id !== intent.latest_charge || charge?.payment_intent !== intent.id) return null;
    return { intent, charge };
  } catch {
    return null;
  }
}

export function verifyFirstSale(evidence = null, liveStripePayment = null) {
  const order = evidence?.order || null;
  const intent = liveStripePayment?.intent || null;
  const charge = liveStripePayment?.charge || null;
  const gross = money(order?.grossRevenueUsd);
  const productCost = money(order?.productCostUsd);
  const freight = money(order?.freightCostUsd);
  const fees = money(order?.paymentFeesUsd ?? 0);
  const grossCents = gross === null ? null : Math.round(gross * 100);
  const checks = {
    evidencePresent: Boolean(order),
    nonTest: order?.test === false,
    paid: order?.paid === true,
    paymentIdPresent: LIVE_PI_ID.test(String(order?.paymentId || '')),
    liveStripeApiVerified: intent?.id === order?.paymentId && intent?.livemode === true && charge?.livemode === true,
    stripePaymentSucceeded: intent?.status === 'succeeded' && charge?.paid === true && charge?.captured === true,
    stripeAmountMatches: grossCents !== null && Number.isSafeInteger(intent?.amount_received) &&
      intent.amount_received === grossCents && charge?.amount_captured === grossCents &&
      charge?.payment_intent === intent?.id && charge?.id === intent?.latest_charge,
    stripeCurrencyUsd: intent?.currency === 'usd' && charge?.currency === 'usd',
    stripeNotRefunded: charge?.refunded === false && charge?.amount_refunded === 0 && charge?.disputed === false,
    supplierOrderVerified: order?.supplierOrderVerified === true,
    shipmentVerified: order?.shipmentVerified === true,
    notRefunded: order?.refunded === false,
    revenueNumeric: gross !== null,
    productCostNumeric: productCost !== null,
    freightCostNumeric: freight !== null,
    paymentFeesNumeric: fees !== null,
  };
  const margin = gross !== null && productCost !== null && freight !== null && fees !== null
    ? gross - productCost - freight - fees : null;
  const verified = Object.values(checks).every(Boolean) && Number.isFinite(margin) && margin >= 0;
  return {
    schemaVersion: 2,
    verifiedFirstSale: verified,
    verifiedSaleCount: verified ? 1 : 0,
    grossRevenueUsd: verified ? gross : null,
    checks,
    netMarginUsd: verified ? margin : null,
    orderReference: null,
    rule: 'Only an authenticated live Stripe succeeded and captured payment matching the order, plus independently verified supplier and shipment evidence, qualifies. Missing Stripe access or failed checks produce no revenue or margin claim.',
  };
}

export async function main() {
  let evidence = null;
  try { evidence = JSON.parse(await fs.readFile('growth-reports/non-test-order-evidence.json', 'utf8')); } catch {}
  const liveStripePayment = await fetchLiveStripePayment(evidence?.order?.paymentId);
  const report = verifyFirstSale(evidence, liveStripePayment);
  await fs.mkdir('growth-reports', { recursive: true });
  await fs.writeFile('growth-reports/first-sale-verification.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
