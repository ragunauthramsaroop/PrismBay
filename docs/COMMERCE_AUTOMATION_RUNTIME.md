# PrismBay Commerce Automation Runtime

This layer connects the merged commerce event, lifecycle and reliability foundations without creating a second fulfillment or email system.

## What is automated

The router accepts canonical commerce events and creates deterministic background jobs for:

- payment completion -> order received communication
- order processing -> processing update
- shipment update -> shipment communication
- verified delivery -> delivery communication plus delayed review request
- delivery exception -> exception communication
- refund processed -> refund communication
- checkout abandonment -> recovery communication only when consent evidence is true

The router stores only de-identified recipient references. Raw customer email addresses are rejected by the durable file job store.

## Durable zero-cost queue

`commerce-job-file-store.mjs` supplies a single-process durable adapter for the existing BullMQ-inspired job contract. It writes an atomic JSON snapshot by creating a temporary file and renaming it into place. Logical-job idempotency survives process restarts.

This adapter is intended for a single worker process. Multi-worker or distributed deployment requires a storage backend with transactional compare-and-set semantics. Do not run several writers against the same file.

## Execution safety

The runtime is dependency-injected. It does not import or call Resend, Stripe, CJ, supplier-order APIs, publishing APIs or any other irreversible external system.

If no handler is configured, due jobs remain queued. A configured handler must return `{ ok: true }` before the job becomes completed. Known transient failures use the existing bounded retry/backoff policy. Uncertain supplier-order, payment or publication operations remain non-retryable and require manual reconciliation.

Dead-letter replay requires explicit approval evidence. The helper refuses replay for the uncertain external-side-effect classes.

## Production activation path

A production worker should inject the existing PrismBay sender rather than creating another sender. Recipient email should be resolved from the authoritative customer/order data source only at execution time. The durable job payload should continue to carry only `recipientRef`.

Before activating customer delivery:

1. verify the authoritative recipient resolver and suppression source
2. verify the existing Resend sender and domain configuration
3. preserve campaign-send logging and idempotency
4. map `templateKind` to `renderCleanEmail`
5. test with approved internal/test recipients only
6. enable production delivery through an explicit environment/configuration gate

No live customer email, supplier order, Stripe object mutation, publication or paid infrastructure is activated by this module.
