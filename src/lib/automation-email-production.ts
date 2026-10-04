import { createStrictAutomationEmailHandler } from "../../scripts/automation-email-delivery-contract.mjs";
import {
  renderCleanEmail,
  type CleanEmailData,
  type CleanEmailKind,
} from "./clean-email-templates";
import { createAutomationEmailLedger } from "./automation-email-ledger";
import { sendEmail } from "./email";

export interface AutomationRecipientLookup {
  recipientRef: string;
  orderRef: string | null;
  eventId: string | null;
  templateKind: CleanEmailKind;
}

export interface AutomationRecipientState {
  recipientRef: string;
  email: string;
  suppressed: boolean;
  transactionalAllowed: boolean;
  marketingConsent: boolean;
  deliveryVerified: boolean;
  productName?: string;
  trackingUrl?: string;
  supportUrl?: string;
  reviewUrl?: string;
  storefrontUrl?: string;
}

export type AutomationRecipientResolver = (
  input: AutomationRecipientLookup,
) => Promise<AutomationRecipientState | null>;

export interface ProductionAutomationEmailOptions {
  resolveRecipient: AutomationRecipientResolver;
  env?: NodeJS.ProcessEnv;
}

/**
 * Build the production automation email handler.
 *
 * This function is intentionally fail-closed. It returns null unless the
 * explicit delivery flag is enabled. The caller must supply the authoritative
 * resolver rather than this module guessing which database table owns customer
 * email, consent, suppression, or delivery evidence.
 */
export function createProductionAutomationEmailHandler({
  resolveRecipient,
  env = process.env,
}: ProductionAutomationEmailOptions) {
  if (env.AUTOMATION_EMAIL_DELIVERY_ENABLED !== "true") return null;
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when automation email delivery is enabled.");
  }

  const ledger = createAutomationEmailLedger(env.DATABASE_URL);

  return createStrictAutomationEmailHandler({
    enabled: true,
    resolveRecipient,
    ledger,
    render: (kind: CleanEmailKind, data: CleanEmailData) =>
      renderCleanEmail(kind, data),
    send: async (params: {
      to: string;
      subject: string;
      body: string;
      html?: string;
    }) => {
      const result = await sendEmail(params);
      return {
        success: result.success,
        outcomeKnown: result.outcomeKnown,
        providerMessageId: result.providerMessageId,
        errorCode: result.success
          ? undefined
          : result.outcomeKnown
            ? "automation_email_provider_rejected"
            : "automation_email_provider_unknown_outcome",
      };
    },
  });
}
