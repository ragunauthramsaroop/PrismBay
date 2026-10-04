/**
 * Transactional email service using Resend.
 *
 * Sends emails through Resend when RESEND_API_KEY is configured.
 * Returns a known failure when the provider is not configured.
 *
 * Required env vars:
 *   RESEND_API_KEY  — Resend API key for sending
 *   EMAIL_FROM      — "From" address (defaults to "PrismBay <support@prismbayai.com>")
 */

import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not set — email sending is not configured.",
      );
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  /** Optional pre-rendered HTML. Plain text remains required as the fallback. */
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
  /**
   * True when we know whether the provider accepted the message.
   * False means a transport/runtime exception left the delivery outcome uncertain,
   * so callers must not retry blindly.
   */
  outcomeKnown: boolean;
  providerMessageId?: string;
}

/**
 * Send a transactional email.
 * When the delivery provider is unconfigured, return a known failure. Recipient
 * addresses and message bodies must never appear in application logs.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM || "PrismBay <support@prismbayai.com>";

  // Transactional messages may contain private access links. Never log recipients or bodies.
  if (!process.env.RESEND_API_KEY) {
    console.error("[EMAIL] Transactional email provider not configured.");
    return {
      success: false,
      error: "Transactional email provider not configured.",
      outcomeKnown: true,
    };
  }

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.body,
      ...(params.html ? { html: params.html } : {}),
    });

    if (error) {
      console.error("[EMAIL] Provider rejected delivery. Check provider dashboard.");
      return { success: false, error: error.message, outcomeKnown: true };
    }

    console.log(`[EMAIL] Sent — ID: ${data?.id}`);
    return {
      success: true,
      outcomeKnown: true,
      ...(data?.id ? { providerMessageId: data.id } : {}),
    };
  } catch (err) {
    const message = (err as Error).message;
    console.error("[EMAIL] Transactional delivery failed with an uncertain provider outcome. Check provider logs before retrying.");
    return { success: false, error: message, outcomeKnown: false };
  }
}

/**
 * Send email and swallow errors — for non-critical email flows
 * where we don't want to block the main action if email fails.
 */
export async function sendEmailQuietly(params: SendEmailParams): Promise<void> {
  try {
    const outcome = await sendEmail(params);
    if (!outcome.success) console.error("[EMAIL] Quiet send failed. Review provider configuration and delivery logs.");
  } catch {
    console.error("[EMAIL] Quiet send raised an error. Review delivery logs.");
  }
}

/* ─── Campaign deduplication ─── */

/**
 * Check whether a recipient has already received a specific campaign email.
 * Uses the email_campaign_log table to prevent duplicate sends.
 *
 * This legacy/general helper is fail-open on database errors and MUST NOT be
 * used by the strict commerce-automation delivery path. That path uses the
 * automation_email_delivery_ledger instead.
 *
 * @param campaignName — e.g. "post-purchase-onboarding"
 * @param templateName — e.g. "post-purchase-day-1"
 */
export async function hasReceived(
  email: string,
  campaignName: string,
  templateName: string,
): Promise<boolean> {
  const { neon } = await import("@neondatabase/serverless");
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[EMAIL] DATABASE_URL not set — cannot check campaign log, assuming not received.");
    return false;
  }
  const db = neon(url);
  try {
    const result = await db.query(
      `SELECT 1 FROM email_campaign_log WHERE recipient_email = $1 AND campaign_name = $2 AND template_name = $3 LIMIT 1`,
      [email.toLowerCase().trim(), campaignName, templateName],
    );
    return (result as unknown[]).length > 0;
  } catch (err) {
    console.error("[EMAIL] Failed to check campaign log:", (err as Error).message);
    // Legacy behavior: assume not received to avoid blocking unrelated campaign sends.
    return false;
  }
}

/**
 * Record that a campaign email was sent to a recipient.
 * Call this after successfully sending to prevent future duplicates.
 *
 * @param campaignName — e.g. "post-purchase-onboarding"
 * @param templateName — e.g. "post-purchase-day-1"
 */
export async function logSent(
  email: string,
  campaignName: string,
  templateName: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { neon } = await import("@neondatabase/serverless");
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[EMAIL] DATABASE_URL not set — cannot log campaign send.");
    return;
  }
  const db = neon(url);
  try {
    await db.query(
      `INSERT INTO email_campaign_log (campaign_name, recipient_email, template_name, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (campaign_name, recipient_email, template_name) DO NOTHING`,
      [campaignName, email.toLowerCase().trim(), templateName, JSON.stringify(metadata ?? {})],
    );
  } catch (err) {
    console.error("[EMAIL] Failed to log campaign send:", (err as Error).message);
  }
}
