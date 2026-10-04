import { neon } from "@neondatabase/serverless";

export type AutomationEmailReservationStatus = "reserved" | "duplicate_sent" | "manual_review";

export interface AutomationEmailReservationInput {
  deliveryKey: string;
  jobId: string;
  recipientRef: string;
  templateKind: string;
  metadata?: Record<string, unknown>;
}

export interface AutomationEmailLedger {
  reserve(input: AutomationEmailReservationInput): Promise<{ status: AutomationEmailReservationStatus }>;
  markSent(deliveryKey: string, metadata?: Record<string, unknown>): Promise<void>;
  markFailedKnown(deliveryKey: string, errorCode: string): Promise<void>;
  markManualReview(deliveryKey: string, errorCode: string): Promise<void>;
}

function requireToken(value: string, field: string, max = 220): string {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > max || !/^[A-Za-z0-9._:/-]+$/.test(normalized)) {
    throw new Error(`invalid_${field}`);
  }
  return normalized;
}

export function createAutomationEmailLedger(databaseUrl = process.env.DATABASE_URL): AutomationEmailLedger {
  if (!databaseUrl) throw new Error("DATABASE_URL is required for automation email delivery.");
  const db = neon(databaseUrl);

  return {
    async reserve(input) {
      const deliveryKey = requireToken(input.deliveryKey, "delivery_key", 180);
      const jobId = requireToken(input.jobId, "job_id");
      const recipientRef = requireToken(input.recipientRef, "recipient_ref", 120);
      const templateKind = requireToken(input.templateKind, "template_kind", 80);
      const metadata = JSON.stringify(input.metadata ?? {});

      const inserted = await db.query(
        `INSERT INTO automation_email_delivery_ledger
          (delivery_key, job_id, recipient_ref, template_kind, state, metadata)
         VALUES ($1, $2, $3, $4, 'reserved', $5::jsonb)
         ON CONFLICT (delivery_key) DO NOTHING
         RETURNING state`,
        [deliveryKey, jobId, recipientRef, templateKind, metadata],
      ) as Array<{ state: string }>;

      if (inserted.length === 1) return { status: "reserved" };

      const existing = await db.query(
        `SELECT state, job_id, recipient_ref, template_kind
           FROM automation_email_delivery_ledger
          WHERE delivery_key = $1
          LIMIT 1`,
        [deliveryKey],
      ) as Array<{ state: string; job_id: string; recipient_ref: string; template_kind: string }>;

      const row = existing[0];
      if (!row) throw new Error("automation_email_ledger_conflict_without_row");
      if (row.job_id !== jobId || row.recipient_ref !== recipientRef || row.template_kind !== templateKind) {
        return { status: "manual_review" };
      }
      if (row.state === "sent") return { status: "duplicate_sent" };
      if (row.state === "failed_known") {
        const reopened = await db.query(
          `UPDATE automation_email_delivery_ledger
              SET state = 'reserved',
                  attempt_count = attempt_count + 1,
                  reserved_at = NOW(),
                  last_error_code = NULL,
                  updated_at = NOW()
            WHERE delivery_key = $1
              AND state = 'failed_known'
          RETURNING state`,
          [deliveryKey],
        ) as Array<{ state: string }>;
        return reopened.length === 1 ? { status: "reserved" } : { status: "manual_review" };
      }
      return { status: "manual_review" };
    },

    async markSent(deliveryKey, metadata = {}) {
      const key = requireToken(deliveryKey, "delivery_key", 180);
      const result = await db.query(
        `UPDATE automation_email_delivery_ledger
            SET state = 'sent',
                sent_at = NOW(),
                metadata = metadata || $2::jsonb,
                updated_at = NOW()
          WHERE delivery_key = $1
            AND state = 'reserved'
        RETURNING delivery_key`,
        [key, JSON.stringify(metadata)],
      ) as Array<{ delivery_key: string }>;
      if (result.length !== 1) throw new Error("automation_email_mark_sent_conflict");
    },

    async markFailedKnown(deliveryKey, errorCode) {
      const key = requireToken(deliveryKey, "delivery_key", 180);
      const code = requireToken(errorCode, "error_code", 180);
      const result = await db.query(
        `UPDATE automation_email_delivery_ledger
            SET state = 'failed_known',
                last_error_code = $2,
                updated_at = NOW()
          WHERE delivery_key = $1
            AND state = 'reserved'
        RETURNING delivery_key`,
        [key, code],
      ) as Array<{ delivery_key: string }>;
      if (result.length !== 1) throw new Error("automation_email_mark_failed_conflict");
    },

    async markManualReview(deliveryKey, errorCode) {
      const key = requireToken(deliveryKey, "delivery_key", 180);
      const code = requireToken(errorCode, "error_code", 180);
      const result = await db.query(
        `UPDATE automation_email_delivery_ledger
            SET state = 'manual_review',
                last_error_code = $2,
                updated_at = NOW()
          WHERE delivery_key = $1
            AND state = 'reserved'
        RETURNING delivery_key`,
        [key, code],
      ) as Array<{ delivery_key: string }>;
      if (result.length !== 1) throw new Error("automation_email_manual_review_conflict");
    },
  };
}
