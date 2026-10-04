# PrismBay Encrypted Recipient Handoff

The physical-order service owns the encrypted customer contact vault. A separate execution worker owns the existing strict email delivery bridge, Neon delivery ledger and Resend sender. This layer lets those two processes exchange the authoritative recipient state for one actively leased email job without returning plaintext customer email from the physical-order API.

## Default state

Recipient handoff is disabled unless all of these controls are enabled:

- `PHYSICAL_ORDER_AUTOMATION_ENABLED=true`
- `AUTOMATION_JOB_HANDOFF_ENABLED=true`
- `AUTOMATION_RECIPIENT_HANDOFF_ENABLED=true`
- `AUTOMATION_WORKER_TOKEN` has at least 32 characters
- `AUTOMATION_WORKER_ENVELOPE_KEY` encodes exactly 32 bytes as 64 hex characters or 43 base64url characters

Enabling recipient handoff without job handoff fails startup.

## Lease binding

The worker first obtains a due email job from the existing lease endpoint. Recipient access then uses:

`POST /internal/automation/jobs/recipient-envelope`

The request contains only `jobId` and `leaseId` plus the existing `x-automation-worker-token` header.

The server verifies that the exact email job is still in `running` state with the supplied unexpired lease. The caller is not allowed to submit or override a recipient reference, order reference, event reference or template kind. Those values are derived from the leased job already accepted by the durable queue.

Stale, expired or mismatched leases are rejected before the encrypted contact vault is opened.

## Recipient resolution

The server uses the existing physical recipient resolver. It joins:

- encrypted contact-vault state
- suppression state
- transactional authorization
- marketing consent
- verified delivery evidence
- physical order context
- tracking context when present

The resolver result must contain the same de-identified `recipientRef` as the leased job. A mismatch fails closed.

## Encrypted envelope

The resolved state is immediately sealed with AES-256-GCM using the separate worker envelope key. The authenticated data binds the ciphertext to both the `jobId` and `leaseId`.

The API response contains only:

- schema version
- algorithm identifier
- IV
- ciphertext
- authentication tag

Plaintext customer email is not returned by the API, written to the queue or included in logs.

A captured envelope cannot be decrypted under another job ID or lease ID. Ciphertext or tag modification also fails authentication.

## Worker use

The worker decrypts the envelope locally using the same exchange key and passes the resulting authoritative recipient state into the existing strict email handler. The strict handler still performs its own execution-time checks before any send:

- recipient reference match
- suppression
- transactional authorization
- marketing consent for abandonment and review requests
- verified delivery for review requests
- atomic delivery-ledger reservation

The envelope therefore transports authoritative state but does not replace the strict delivery controls.

## Explicit exclusions

This layer does not:

- enable `AUTOMATION_EMAIL_DELIVERY_ENABLED`
- send customer email
- infer consent
- create supplier orders
- mutate Stripe or carrier state
- publish products
- provision paid infrastructure
