# PrismBay Strict Automation Email Delivery

This bridge connects the durable commerce automation jobs to the existing PrismBay Clean renderer and existing Resend sender. It does not create a second email system.

## Default state

Production delivery is disabled unless `AUTOMATION_EMAIL_DELIVERY_ENABLED` is exactly `true`.

The production adapter also requires `DATABASE_URL` for the strict automation delivery ledger and the existing `RESEND_API_KEY` for the current sender. This implementation does not set those values and does not send a live customer message.

## Authoritative recipient resolver

The application or deployment layer must inject an authoritative resolver that maps the queued `recipientRef` to current customer state at execution time. The durable queue does not store raw customer email addresses.

The resolver must return current evidence for:

- recipient reference
- email address
- suppression status
- transactional-delivery authorization
- marketing consent where required
- verified delivery evidence for review requests
- optional product, tracking, support, review and storefront URLs

This repository does not guess which existing database table owns those facts. Delivery remains blocked until a verified authoritative resolver is supplied.

## Execution-time gates

Every automated message is re-evaluated immediately before sending.

- suppressed recipients are blocked
- transactional delivery requires explicit authorization evidence
- abandonment recovery requires current marketing consent
- review requests require current marketing consent and verified delivery evidence
- recipient reference mismatches are blocked
- resolver or ledger outages fail closed

## Strict idempotency ledger

Migration `015_automation_email_delivery_ledger.sql` creates a de-identified delivery ledger. The primary delivery key is derived from the queue idempotency key, `recipientRef` and template kind. Raw email is not stored in this ledger.

The sender reserves the delivery key before sending. A previously `sent` reservation is treated as complete without another send. A known provider rejection can move to `failed_known` and later be reserved again by the same logical delivery. A reserved or `manual_review` record is not retried automatically.

If the provider outcome becomes uncertain, the ledger is moved to `manual_review`. If the email provider accepts the message but the post-send ledger update fails, the job also reports an unknown outcome so it is not retried blindly.

## Existing campaign log

`email_campaign_log` and the legacy `hasReceived` / `logSent` helpers remain available for existing non-strict campaign flows. They are not used by strict commerce automation because the older helper path intentionally has fail-open behavior on database errors.

## Sender outcome contract

The existing `sendEmail` transport now reports `outcomeKnown` in addition to `success`.

- missing provider configuration: known failure
- explicit provider rejection: known failure
- successful provider acceptance: known success with provider message ID when available
- transport or runtime exception: unknown outcome

Unknown outcomes must be reconciled from provider evidence before any replay.

## Activation checklist

Before production delivery is enabled:

1. verify the authoritative `recipientRef` resolver and ownership of customer email data
2. verify the current suppression and consent source
3. verify the source of delivery evidence used for review requests
4. apply migration `015_automation_email_delivery_ledger.sql` to the intended database
5. verify `DATABASE_URL`, `RESEND_API_KEY` and the sending domain configuration
6. run an approved internal/test-recipient exercise and confirm ledger transitions and provider evidence
7. enable `AUTOMATION_EMAIL_DELIVERY_ENABLED=true` only after those checks pass

No supplier order, Stripe mutation, product publication, paid infrastructure change or customer email is performed by this implementation task itself.
