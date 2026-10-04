# PrismBay Durable Automation Job Handoff

This layer provides a narrow transport boundary between the physical-order service, which owns the durable de-identified automation queue, and a separate execution worker. It does not send email itself.

## Default state

The handoff API remains disabled unless all of the following are true:

- `PHYSICAL_ORDER_AUTOMATION_ENABLED=true`
- `AUTOMATION_JOB_HANDOFF_ENABLED=true`
- `AUTOMATION_WORKER_TOKEN` is configured with at least 32 characters

The worker token is checked using a constant-time comparison. Unauthorized requests receive `404` so the internal worker surface is not advertised.

## Lease endpoint

`POST /internal/automation/jobs/lease`

Header:

`x-automation-worker-token: <AUTOMATION_WORKER_TOKEN>`

Body fields:

- `limit`: 1 to 50 jobs after server clamping
- `leaseMs`: 5,000 to 300,000 milliseconds

Only due jobs with `jobClass=email` are eligible. The response includes the job identity, operation, idempotency key, de-identified payload and an opaque lease ID with expiration time. It does not expose raw customer email or arbitrary order-ledger state.

Leasing changes the canonical queue state from `queued` or `delayed` to `running`. A second lease request does not receive the same active job.

## Acknowledgement endpoint

`POST /internal/automation/jobs/ack`

The same worker-token header is required. The request includes:

- `jobId`
- `leaseId`
- `outcome`

A successful outcome moves the job to `completed`. A structured failure is passed through PrismBay's existing reliability classifier so transient known failures follow retry backoff and non-retryable failures fail closed.

Stale, mismatched or expired lease acknowledgements are rejected.

## Expired leases

Expired email leases are returned to the runnable queue when the broker next scans for work. This does not itself repeat an external send. The downstream strict email delivery ledger remains the delivery-level idempotency authority:

- already-sent delivery keys are treated as duplicates and are not sent again
- uncertain sender outcomes are marked for manual review
- post-send ledger uncertainty fails closed

This two-layer design separates transport recovery from provider-side delivery certainty.

## Persistence and concurrency

`FileJobStore` serializes durable mutations. Enqueue, projection, lease and acknowledgement operations therefore write one ordered state snapshot at a time inside the service process. Files are written through a temporary file, synced, renamed atomically and the parent directory is synced on supported platforms.

The current file-backed queue is intentionally a single-service-writer design. This handoff removes the need for the email executor to mount the queue file directly.

## Privacy boundary

The queue store rejects raw-email-like values and common email field names. Worker responses contain only the de-identified payload already admitted to the queue. The execution worker resolves the real recipient later through the encrypted contact resolver used by the strict email delivery bridge.

## Explicit exclusions

This layer does not:

- enable `AUTOMATION_EMAIL_DELIVERY_ENABLED`
- send customer email
- create supplier orders
- mutate Stripe or carrier state
- publish products
- provision paid infrastructure
