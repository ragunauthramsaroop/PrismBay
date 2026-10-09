import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_UPSTREAM = 'https://browser-worker-production-f5b4.up.railway.app';
const TRUSTED_ORIGIN = 'https://www.prismbayai.com';

function validZip(value: unknown) {
  return /^\d{5}$/.test(String(value || '').trim());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  const zip = String(req.body?.zip || '').trim();
  const quantity = Number(req.body?.quantity || 1);
  const sku = String(req.body?.sku || '').trim();
  const quoteToken = String(req.body?.quoteToken || '').trim();
  if (!validZip(zip)) return res.status(400).json({ ok: false, error: 'valid_us_zip_required' });
  if (sku !== 'garment-steamer') return res.status(400).json({ ok: false, error: 'unsupported_sku' });
  if (quantity !== 1) return res.status(400).json({ ok: false, error: 'invalid_quantity' });

  const upstream = String(process.env.PHYSICAL_ORDER_SERVICE_URL || DEFAULT_UPSTREAM).replace(/\/$/, '');
  try {
    const response = await fetch(`${upstream}/v1/quote`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        origin: TRUSTED_ORIGIN,
      },
      body: JSON.stringify(quoteToken ? { zip, quoteToken } : { zip }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    let payload: any = {};
    try { payload = JSON.parse(text); } catch { payload = { success: false, error: 'quote_service_invalid_response' }; }
    if (!response.ok || payload?.success !== true) {
      return res.status(response.status >= 400 && response.status < 600 ? response.status : 502).json({
        ok: false,
        error: payload?.error || 'quote_unavailable',
      });
    }
    return res.status(200).json({
      ok: true,
      stage: payload.stage || null,
      sku,
      zip,
      quantity,
      freightUsd: payload.shippingUsd ?? null,
      deliveryEstimate: payload.estimatedDelivery ?? null,
      quoteToken: payload.quoteToken ?? null,
      checkoutUrl: payload.checkoutUrl ?? null,
    });
  } catch {
    return res.status(502).json({ ok: false, error: 'quote_service_unreachable' });
  }
}
