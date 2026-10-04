import { createStrictAutomationEmailHandler } from "../../scripts/automation-email-delivery-contract.mjs";
import {
  renderCleanEmail,
  type CleanEmailData,
  type CleanEmailKind,
} from "./clean-email-templates";
import {
  createAutomationEmailLedger,
  type AutomationEmailLedger,
} from "./automation-email-ledger";
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

interface StrictSendOutcome {
  success: boolean;
  outcomeKnown: boolean;
  providerMessageId?: string;
  errorCode?: string;
  httpStatus?: number | null;
}

interface StrictDeliveryFactoryOptions {
  enabled: true;
  resolveRecipient: AutomationRecipientResolver;
  ledger: AutomationEmailLedger;
  render: (kind: CleanEmailKind, data: CleanEmailData) => {
    subject: string;
    text: string;
    html: string;
  };
  send: (params: {
    to: string;
    subject: string;
    body: string;
    html?: string;
  }) => Promise<StrictSendOutcome>;
}

type StrictDeliveryHandler = (job: unknown) => Promise<unknown>;
type StrictDeliveryFactory = (
  options: StrictDeliveryFactoryOptions,
) => StrictDeliveryHandler | null;

// The runtime contract is an original JavaScript module. Keep the untyped JS
// boundary explicit here rather than weakening type checking across the app.
const strictDeliveryFactory = createStrictAutomationEmailHandler as unknown as StrictDeliveryFactory;

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
}: ProductionAutomationEmailOptions): StrictDeliveryHandler | null {
  if (env.AUTOMATION_EMAIL_DELIVERY_ENABLED !== "true") return null;
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when automation email delivery is enabled.");
  }

  const ledger = createAutomationEmailLedger(env.DATABASE_URL);

  return strictDeliveryFactory({
    enabled: true,
    resolveRecipient,
    ledger,
    render: (kind: CleanEmailKind, data: CleanEmailData) =>
      renderCleanEmail(kind, data),
    send: async (params) => {
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
