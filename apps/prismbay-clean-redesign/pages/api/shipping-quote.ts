import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_UPSTREAM = 'https://prismbay-physical-order-reconciler-srm7mm.v2.appdeploy.ai';

function validZip(value: unknown) {
  return /^\d{5}$/.test(String(value || '').trim());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const zip = String(req.body?.zip || '').trim();
  const quantity = Number(req.body?.quantity || 1);
  const sku = String(req.body?.sku || '').trim();
  if (!validZip(zip)) return res.status(400).json({ ok: false, error: 'valid_us_zip_required' });
  if (sku !== 'garment-steamer') return res.status(400).json({ ok: false, error: 'unsupported_sku' });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) return res.status(400).json({ ok: false, error: 'invalid_quantity' });

  const upstream = String(process.env.PHYSICAL_ORDER_SERVICE_URL || DEFAULT_UPSTREAM).replace(/\/$/, '');
  try {
    const response = await fetch(`${upstream}/shipping/quote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sku, zip, quantity, country: 'US' }),
      signal: AbortSignal.timeout(12000),
    });
    const text = await response.text();
    let payload: any = {};
    try { payload = JSON.parse(text); } catch { payload = { ok: false, error: 'quote_service_invalid_response' }; }
    if (!response.ok || payload?.ok !== true) {
      return res.status(response.status >= 400 && response.status < 600 ? response.status : 502).json({
        ok: false,
        error: payload?.error || 'quote_unavailable',
      });
    }
    return res.status(200).json({
      ok: true,
      sku,
      zip,
      quantity,
      freightUsd: payload.freightUsd ?? payload.quote?.freightUsd ?? null,
      contributionUsd: payload.contributionUsd ?? payload.quote?.contributionUsd ?? null,
      logisticsMethod: payload.logisticsMethod ?? payload.method ?? null,
      deliveryEstimate: payload.deliveryEstimate ?? payload.aging ?? null,
      quoteToken: payload.quoteToken ?? payload.token ?? null,
      checkoutUrl: payload.checkoutUrl ?? payload.stripePaymentUrl ?? null,
    });
  } catch {
    return res.status(502).json({ ok: false, error: 'quote_service_unreachable' });
  }
}
