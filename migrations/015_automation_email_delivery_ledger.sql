-- 015_automation_email_delivery_ledger.sql
-- Strict idempotency ledger for automated PrismBay Clean email delivery.
-- Raw customer email addresses are intentionally excluded from this table.

CREATE TABLE IF NOT EXISTS automation_email_delivery_ledger (
  delivery_key     TEXT PRIMARY KEY,
  job_id           TEXT NOT NULL,
  recipient_ref    TEXT NOT NULL,
  template_kind    TEXT NOT NULL,
  state            TEXT NOT NULL CHECK (state IN ('reserved', 'sent', 'failed_known', 'manual_review')),
  attempt_count    INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
  reserved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at          TIMESTAMPTZ,
  last_error_code  TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_email_delivery_recipient
  ON automation_email_delivery_ledger (recipient_ref, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_email_delivery_state
  ON automation_email_delivery_ledger (state, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_email_delivery_job_template
  ON automation_email_delivery_ledger (job_id, template_kind, recipient_ref);
