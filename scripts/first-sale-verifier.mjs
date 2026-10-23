import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Only a successful live Stripe API retrieval creates an attested receipt.
// A caller-supplied JSON object is never authenticated payment evidence.
const authenticatedPaymentReceipts = new WeakSet();

// Read-only and disabled unless the owner provisions a restricted live key.
export async function retrieveLiveStripePayment(paymentId) {
  const restrictedKey = process.env.PRISMBAY_STRIPE_READ_ONLY_KEY;
  const enabled = process.env.PRISMBAY_STRIPE_READ_ONLY_VERIFICATION === '1';
  if (!enabled || !/^rk_live_[A-Za-z0-9]+$/.test(restrictedKey || '') ||
      !/^pi_[A-Za-z0-9]+$/.test(paymentId || '')) return null;
  try {
    const url = new URL(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentId)}`);
    url.searchParams.append('expand[]', 'latest_charge');
    const response = await globalThis.fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${restrictedKey}` },
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const intent = await response.json();
    const charge = intent?.latest_charge;
    if (intent?.id !== paymentId || intent?.object !== 'payment_intent' ||
        intent?.livemode !== true || intent?.status !== 'succeeded' ||
        intent?.currency !== 'usd' || intent?.metadata?.commerce_schema !== 'prismbay-v1' ||
        !/^[A-Za-z0-9._-]{1,120}$/.test(intent?.metadata?.sku || '') ||
        !Number.isSafeInteger(intent?.amount_received) ||
        intent.amount_received <= 0 || !charge || typeof charge !== 'object' ||
        charge?.payment_intent !== paymentId || charge?.livemode !== true ||
        charge?.currency !== 'usd' || charge?.status !== 'succeeded' ||
        charge?.paid !== true || charge?.captured !== true ||
        charge?.amount_captured !== intent.amount_received ||
        charge?.refunded !== false || charge?.disputed !== false ||
        charge?.amount_refunded !== 0) return null;
    const receipt = Object.freeze({
      paymentId, sku: intent.metadata.sku,
      amountReceivedCents: intent.amount_received, currency: 'usd'
    });
    authenticatedPaymentReceipts.add(receipt);
    return receipt;
  } catch {
    // Do not log Stripe responses, authorization headers or customer data.
    return null;
  }
}

export function verifyFirstSale(evidence = null, liveStripePayment = null) {
  const order = evidence?.order || null;
  const gross = liveStripePayment?.amountReceivedCents;
  const livePaid = Boolean(order && liveStripePayment &&
    authenticatedPaymentReceipts.has(liveStripePayment) &&
    liveStripePayment.paymentId === order.paymentId &&
    liveStripePayment.sku === order.sku && order.test === false &&
    liveStripePayment.currency === 'usd' &&
    Number.isSafeInteger(gross) && gross > 0 &&
    Number.isFinite(order.grossRevenueUsd) && order.grossRevenueUsd > 0 &&
    Math.round(order.grossRevenueUsd * 100) === gross);
  const financialInputsReady = livePaid &&
    Number.isFinite(order.productCostUsd) && order.productCostUsd >= 0 &&
    Number.isFinite(order.freightCostUsd) && order.freightCostUsd >= 0 &&
    Number.isFinite(order.paymentFeesUsd) && order.paymentFeesUsd >= 0;
  const netMarginUsd = financialInputsReady
    ? Number(((gross / 100) - order.productCostUsd - order.freightCostUsd - order.paymentFeesUsd).toFixed(2))
    : null;
  return {
    schemaVersion: 2,
    verifiedFirstSale: livePaid,
    verifiedSaleCount: livePaid ? 1 : 0,
    grossRevenueUsd: livePaid ? gross / 100 : 0,
    verificationStatus: livePaid ? 'live_stripe_paid_verified' : 'live_stripe_paid_unverified',
    fulfillmentVerified: livePaid && order.supplierOrderVerified === true && order.shipmentVerified === true,
    marginVerified: financialInputsReady,
    netMarginUsd,
    checks: {
      liveStripePaidVerified: livePaid,
      supplierOrderVerified: order?.supplierOrderVerified === true,
      shipmentVerified: order?.shipmentVerified === true,
      marginInputsComplete: financialInputsReady,
    },
    rule: 'Revenue requires authenticated read-only retrieval of a non-refunded, non-disputed live Stripe paid transaction. Fulfillment and margin are separate milestones.',
  };
}

export async function main() {
  let evidence = null;
  try { evidence = JSON.parse(await fs.readFile('growth-reports/non-test-order-evidence.json', 'utf8')); } catch {}
  const payment = await retrieveLiveStripePayment(evidence?.order?.paymentId);
  const report = verifyFirstSale(evidence, payment);
  await fs.mkdir('growth-reports', { recursive: true });
  await fs.writeFile('growth-reports/first-sale-verification.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
