// PrismBay Clean transactional email renderer.
// Layout/component concepts are inspired by React Email: https://github.com/resend/react-email (MIT).
// No React Email source is copied and no second email sender is created.

export type CleanEmailKind =
  | "order_received"
  | "processing_update"
  | "shipped"
  | "delivered"
  | "delivery_exception"
  | "refund"
  | "abandonment"
  | "review_request";

export interface CleanEmailData {
  orderRef?: string;
  productName?: string;
  trackingUrl?: string;
  supportUrl?: string;
  reviewUrl?: string;
  storefrontUrl?: string;
  refundAmountUsd?: number;
}

export interface RenderedCleanEmail {
  subject: string;
  text: string;
  html: string;
}

const DEFAULT_STORE = "https://clean.prismbayai.com/";
const DEFAULT_SUPPORT = "https://clean.prismbayai.com/contact.html";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeHttpsUrl(value: string | undefined, fallback: string): string {
  try {
    const url = new URL(value || fallback);
    if (url.protocol !== "https:") return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

function money(value: number | undefined): string | null {
  if (!Number.isFinite(value) || Number(value) < 0) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function shell(title: string, lead: string, details: string[], cta?: { label: string; url: string }): string {
  const detailRows = details
    .filter(Boolean)
    .map((item) => `<p style="margin:0 0 10px;color:#344054;font-size:15px;line-height:1.6">${escapeHtml(item)}</p>`)
    .join("");
  const ctaHtml = cta
    ? `<p style="margin:26px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#0a66c2;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">${escapeHtml(cta.label)}</a></p>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#101828"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fa;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e4e7ec;border-radius:14px;overflow:hidden"><tr><td style="padding:24px 28px;background:#0a66c2;color:#ffffff"><div style="font-size:21px;font-weight:800;letter-spacing:.2px">PrismBay Clean</div><div style="margin-top:5px;font-size:13px;opacity:.9">Practical tools. Straightforward checkout.</div></td></tr><tr><td style="padding:30px 28px"><h1 style="margin:0 0 12px;font-size:26px;line-height:1.25">${escapeHtml(title)}</h1><p style="margin:0 0 22px;color:#475467;font-size:16px;line-height:1.6">${escapeHtml(lead)}</p>${detailRows}${ctaHtml}<hr style="border:0;border-top:1px solid #e4e7ec;margin:28px 0"><p style="margin:0;color:#667085;font-size:13px;line-height:1.6">Questions? Contact PrismBay Clean support. We do not ask for card details by email.</p></td></tr></table><p style="max-width:620px;margin:14px auto 0;color:#98a2b3;font-size:12px;text-align:center">PrismBay Clean is operated by STUDYSMARTZ LLC.</p></td></tr></table></body></html>`;
}

export function renderCleanEmail(kind: CleanEmailKind, data: CleanEmailData = {}): RenderedCleanEmail {
  const orderRef = data.orderRef ? `Order ${data.orderRef}` : "Your order";
  const product = data.productName ? `Product: ${data.productName}` : "";
  const supportUrl = safeHttpsUrl(data.supportUrl, DEFAULT_SUPPORT);
  const storefrontUrl = safeHttpsUrl(data.storefrontUrl, DEFAULT_STORE);
  const trackingUrl = safeHttpsUrl(data.trackingUrl, supportUrl);
  const reviewUrl = safeHttpsUrl(data.reviewUrl, supportUrl);
  const refund = money(data.refundAmountUsd);

  switch (kind) {
    case "order_received": {
      const subject = `PrismBay Clean — ${orderRef} received`;
      const lines = [
        `${orderRef} has been received and entered order processing.`,
        product,
        "We will send another update when verified fulfillment information is available.",
        "Your card details remain with the payment provider and are not requested by email."
      ].filter(Boolean);
      return { subject, text: `${lines.join("\n\n")}\n\nSupport: ${supportUrl}`, html: shell("Order received", lines[0], lines.slice(1), { label: "Contact support", url: supportUrl }) };
    }
    case "processing_update": {
      const subject = `PrismBay Clean — ${orderRef} processing update`;
      const lines = [`${orderRef} is still being processed.`, product, "We will send tracking information after a verified shipment update is available."].filter(Boolean);
      return { subject, text: `${lines.join("\n\n")}\n\nSupport: ${supportUrl}`, html: shell("Processing update", lines[0], lines.slice(1), { label: "Contact support", url: supportUrl }) };
    }
    case "shipped": {
      const subject = `PrismBay Clean — ${orderRef} shipment update`;
      const lines = [`A shipment update is available for ${orderRef}.`, product, "Use the tracking link for the latest carrier information."].filter(Boolean);
      return { subject, text: `${lines.join("\n\n")}\n\nTracking: ${trackingUrl}`, html: shell("Shipment update", lines[0], lines.slice(1), { label: "View tracking", url: trackingUrl }) };
    }
    case "delivered": {
      const subject = `PrismBay Clean — ${orderRef} delivery update`;
      const lines = [`Carrier information indicates ${orderRef} was delivered.`, product, "If anything is incorrect or damaged, contact support with the order reference."].filter(Boolean);
      return { subject, text: `${lines.join("\n\n")}\n\nSupport: ${supportUrl}`, html: shell("Delivery update", lines[0], lines.slice(1), { label: "Contact support", url: supportUrl }) };
    }
    case "delivery_exception": {
      const subject = `PrismBay Clean — action may be needed for ${orderRef}`;
      const lines = [`A delivery exception was reported for ${orderRef}.`, "Please use the latest tracking information or contact support so the issue can be reviewed."].filter(Boolean);
      return { subject, text: `${lines.join("\n\n")}\n\nTracking: ${trackingUrl}\nSupport: ${supportUrl}`, html: shell("Delivery exception", lines[0], lines.slice(1), { label: "View tracking", url: trackingUrl }) };
    }
    case "refund": {
      const subject = `PrismBay Clean — refund update for ${orderRef}`;
      const amountLine = refund ? `Refund amount: ${refund}.` : "A refund update has been recorded for this order.";
      const lines = [amountLine, "Bank or card-provider posting times vary after a refund is processed."].filter(Boolean);
      return { subject, text: `${lines.join("\n\n")}\n\nSupport: ${supportUrl}`, html: shell("Refund update", lines[0], lines.slice(1), { label: "Contact support", url: supportUrl }) };
    }
    case "abandonment": {
      const subject = "PrismBay Clean — still interested?";
      const lines = ["If you still want the item you were viewing, return to PrismBay Clean and check current availability before checkout.", "Prices, availability and delivery options should be confirmed at the time of checkout."].filter(Boolean);
      return { subject, text: `${lines.join("\n\n")}\n\nShop: ${storefrontUrl}`, html: shell("Still interested?", lines[0], lines.slice(1), { label: "Check current availability", url: storefrontUrl }) };
    }
    case "review_request": {
      const subject = `PrismBay Clean — how did ${orderRef} go?`;
      const lines = ["If your order has arrived, we would value an honest review of the product and experience.", "Reviews are requested only after delivery evidence is available. There is no incentive for a positive rating."].filter(Boolean);
      return { subject, text: `${lines.join("\n\n")}\n\nReview: ${reviewUrl}`, html: shell("Share your experience", lines[0], lines.slice(1), { label: "Write a review", url: reviewUrl }) };
    }
    default:
      throw new Error(`unsupported_clean_email_kind:${kind satisfies never}`);
  }
}
