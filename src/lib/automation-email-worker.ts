import {
  createAutomationEmailWorkerClient,
  runAutomationEmailWorkerBatch,
} from "../../scripts/automation-email-worker-protocol.mjs";
import {
  createProductionAutomationEmailHandler,
  type AutomationRecipientLookup,
  type AutomationRecipientState,
} from "./automation-email-production";

interface WorkerJobPayload {
  eventId?: string | null;
  recipientRef: string;
  orderRef?: string | null;
  productRef?: string | null;
  trackingRef?: string | null;
  refundAmountUsd?: number | null;
  templateKind: string;
}

interface WorkerJob {
  id: string;
  jobClass: string;
  operation: string;
  idempotencyKey: string;
  state: string;
  payload: WorkerJobPayload;
  lease: { id: string; expiresAt: string };
}

interface StrictHandlerOutcome {
  ok: boolean;
  errorCode?: string;
  outcomeKnown?: boolean;
  httpStatus?: number | null;
}

interface WorkerBatchItem {
  jobId: string;
  status: string;
  phase: string;
  acknowledged: boolean;
}

interface WorkerBatchResult {
  leased: number;
  recoveredExpiredLeases: number;
  results: WorkerBatchItem[];
}

interface WorkerProtocolClient {
  lease: () => Promise<unknown>;
  recipientState: (job: WorkerJob) => Promise<AutomationRecipientState>;
  acknowledge: (job: WorkerJob, outcome: StrictHandlerOutcome) => Promise<unknown>;
}

type WorkerClientFactory = (options: {
  baseUrl: string;
  workerToken: string;
  envelopeKey: string;
  fetchImpl: typeof fetch;
  limit: number;
  leaseMs: number;
}) => WorkerProtocolClient;

type WorkerBatchRunner = (options: {
  client: WorkerProtocolClient;
  execute: (job: WorkerJob, state: AutomationRecipientState) => Promise<StrictHandlerOutcome>;
}) => Promise<WorkerBatchResult>;

const buildWorkerClient = createAutomationEmailWorkerClient as unknown as WorkerClientFactory;
const executeWorkerBatch = runAutomationEmailWorkerBatch as unknown as WorkerBatchRunner;

export interface ProductionAutomationWorkerOptions {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  limit?: number;
  leaseMs?: number;
}

function lookupMatchesJob(lookup: AutomationRecipientLookup, job: WorkerJob): boolean {
  return (
    lookup.recipientRef === job.payload.recipientRef &&
    lookup.orderRef === (job.payload.orderRef || null) &&
    lookup.eventId === (job.payload.eventId || null) &&
    lookup.templateKind === job.payload.templateKind
  );
}

function normalizeOutcome(value: unknown): StrictHandlerOutcome {
  const result = (value || {}) as Partial<StrictHandlerOutcome>;
  if (result.ok === true) return { ok: true, outcomeKnown: true };
  return {
    ok: false,
    errorCode: String(result.errorCode || "automation_email_worker_handler_failed"),
    outcomeKnown: result.outcomeKnown !== false,
    httpStatus: result.httpStatus ?? null,
  };
}

/**
 * Execute one bounded batch of leased automation email jobs.
 *
 * This function remains disabled unless both the worker gate and the existing
 * strict delivery gate are explicitly enabled. No scheduler is installed here.
 */
export async function runProductionAutomationEmailWorkerBatch({
  env = process.env,
  fetchImpl = fetch,
  limit = 10,
  leaseMs = 60_000,
}: ProductionAutomationWorkerOptions = {}) {
  if (env.AUTOMATION_EMAIL_WORKER_ENABLED !== "true") {
    return { enabled: false, leased: 0, recoveredExpiredLeases: 0, results: [] as WorkerBatchItem[] };
  }
  if (env.AUTOMATION_EMAIL_DELIVERY_ENABLED !== "true") {
    throw new Error("AUTOMATION_EMAIL_DELIVERY_ENABLED must be true before the email worker can execute.");
  }
  if (!env.AUTOMATION_PHYSICAL_SERVICE_URL) {
    throw new Error("AUTOMATION_PHYSICAL_SERVICE_URL is required when the email worker is enabled.");
  }
  if (!env.AUTOMATION_WORKER_TOKEN) {
    throw new Error("AUTOMATION_WORKER_TOKEN is required when the email worker is enabled.");
  }
  if (!env.AUTOMATION_WORKER_ENVELOPE_KEY) {
    throw new Error("AUTOMATION_WORKER_ENVELOPE_KEY is required when the email worker is enabled.");
  }

  const client = buildWorkerClient({
    baseUrl: env.AUTOMATION_PHYSICAL_SERVICE_URL,
    workerToken: env.AUTOMATION_WORKER_TOKEN,
    envelopeKey: env.AUTOMATION_WORKER_ENVELOPE_KEY,
    fetchImpl,
    limit,
    leaseMs,
  });

  const batch = await executeWorkerBatch({
    client,
    execute: async (job, recipientState) => {
      if (recipientState.recipientRef !== job.payload.recipientRef) {
        return {
          ok: false,
          errorCode: "recipient_reference_mismatch",
          outcomeKnown: true,
          httpStatus: 422,
        };
      }

      const handler = createProductionAutomationEmailHandler({
        env,
        resolveRecipient: async (lookup) =>
          lookupMatchesJob(lookup, job) ? recipientState : null,
      });
      if (!handler) {
        return {
          ok: false,
          errorCode: "automation_email_delivery_disabled",
          outcomeKnown: true,
          httpStatus: 503,
        };
      }

      return normalizeOutcome(await handler(job));
    },
  });

  return { enabled: true, ...batch };
}
