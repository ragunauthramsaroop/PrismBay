# PrismBay Strict Automation Email Worker

This worker is the execution-side bridge between PrismBay's durable physical-order automation queue and the existing strict email delivery stack. It leases de-identified jobs from the physical-order service, retrieves a lease-bound encrypted recipient envelope, decrypts the authoritative recipient state locally and then invokes the existing production email handler.

## Default state

The worker does nothing unless:

- `AUTOMATION_EMAIL_WORKER_ENABLED=true`
- `AUTOMATION_EMAIL_DELIVERY_ENABLED=true`

When the worker is enabled it also requires:

- `AUTOMATION_PHYSICAL_SERVICE_URL`
- `AUTOMATION_WORKER_TOKEN`
- `AUTOMATION_WORKER_ENVELOPE_KEY`
- `DATABASE_URL`
- the existing Resend configuration required by the production sender

Outside localhost development, the physical-service URL must use HTTPS.

No scheduler is installed by this tranche. Adding the worker command does not start it automatically.

## Execution sequence

One bounded worker batch performs these steps serially:

1. Lease due `email` jobs from the physical-order service.
2. Request the encrypted recipient envelope using the exact active job and lease IDs.
3. Decrypt the envelope locally using `AUTOMATION_WORKER_ENVELOPE_KEY`.
4. Verify that the decrypted `recipientRef` matches the leased job.
5. Build the existing `createProductionAutomationEmailHandler` with a resolver that returns only the state bound to that exact job.
6. Execute the strict handler.
7. Acknowledge success only after the strict handler reports success.
8. Return structured known or unknown failure evidence to the durable queue when execution fails.

The worker processes jobs serially to keep the resolver binding unambiguous and the batch bounded.

## Existing delivery controls remain authoritative

The worker does not bypass or duplicate the delivery layer. The existing strict handler still owns:

- execution-time recipient resolution checks
- suppression checks
- transactional authorization
- marketing consent for abandonment and review messages
- verified-delivery evidence for review requests
- atomic Neon delivery-ledger reservation
- duplicate-sent suppression
- known provider rejection handling
- unknown provider outcome manual-review handling
- post-send ledger failure handling
- the existing PrismBay Clean renderer
- the existing Resend sender

## Transport failure behavior

If recipient-envelope retrieval fails before a send attempt, the worker treats the failure as known pre-send failure and asks the queue to apply its normal reliability policy.

If the executor throws unexpectedly, the worker reports an unknown outcome. The queue fails closed rather than assuming a retry is safe.

If acknowledgement itself fails, the worker does not invent completion. The lease remains unacknowledged and the queue's lease recovery path handles it later. Provider-side delivery certainty remains protected by the strict delivery ledger.

## Logging and privacy

The worker protocol does not log:

- customer email
- decrypted recipient state
- message subject or body
- worker token
- envelope key
- ciphertext contents

The CLI entrypoint prints only aggregate batch counts and final queue-state counts.

## Command

When all production controls are intentionally configured, one bounded batch is available through:

`bun run automation:email-worker`

This command is not scheduled or invoked automatically by the repository changes in this tranche.
