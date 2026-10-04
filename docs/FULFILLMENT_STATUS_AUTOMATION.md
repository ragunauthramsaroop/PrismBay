# PrismBay Fulfillment Status Automation

This layer extends the verified physical-order workflow from paid Checkout evidence into processing, shipment, delivery, exception and refund notification events. It does not create supplier orders, modify carrier state, mutate Stripe objects or send customer email by itself.

## Default state

The capability is disabled unless both of these flags are enabled:

- `PHYSICAL_ORDER_AUTOMATION_ENABLED=true`
- `FULFILLMENT_STATUS_AUTOMATION_ENABLED=true`

The existing encrypted contact automation also requires `AUTOMATION_CONTACT_VAULT_KEY` and `AUTOMATION_RECIPIENT_REF_KEY`, each encoding exactly 32 bytes. Fulfillment status writes additionally require `FULFILLMENT_STATUS_WRITE_TOKEN` with at least 32 characters.

If the fulfillment flag is enabled without the physical-order automation layer, startup fails closed.

## Authenticated status input

Verified internal evidence is accepted at:

`POST /internal/fulfillment/status`

The caller must send the exact write token in `x-fulfillment-status-token`. Missing or incorrect authorization returns `404` and does not invoke the status processor.

The endpoint accepts only these canonical events:

- `order_processing`
- `shipment_update`
- `delivery_exception`
- `delivery_confirmed`
- `refund_processed`

Every input requires a unique `ful_...` event ID, the existing paid physical Stripe Checkout Session ID, a supported evidence source, an evidence reference and an occurrence timestamp. Shipment and delivery-exception events require an HTTPS tracking URL. Refund events require a verified non-negative refund amount.

## Evidence policy

Supported evidence sources are `supplier_api`, `carrier_api`, `stripe_webhook` and `operator_verified`, but higher-risk states have narrower rules:

- delivery confirmation is accepted only from `carrier_api` or `operator_verified`
- refund evidence is accepted only from `stripe_webhook` or `operator_verified`

The status state machine permits only forward operational transitions. Evidence that attempts an illegal transition or moves the recorded chronology backwards is rejected.

Each fulfillment event is fingerprinted. Reusing an event ID with changed session, source, reference, timestamp, tracking data or refund data is treated as a replay mismatch and rejected. Exact replay is safe and the durable automation queue suppresses duplicate jobs.

## Durable state and privacy

The physical order ledger stores the operational fulfillment state and, when supplied, the tracking URL. Tracking URLs are not copied into analytics or automation job payloads.

The durable queue carries only de-identified recipient references plus safe order/product/evidence references. Customer email remains in the separate AES-256-GCM encrypted contact vault.

For repeat customers, the contact vault retains recent Checkout Session references so a later fulfillment event still resolves to the correct encrypted contact without exposing raw email to the queue.

## Notification projection

Verified states project into the canonical commerce automation runtime:

| Fulfillment evidence | Automation email operation |
| --- | --- |
| `order_processing` | `processing_update` |
| `shipment_update` | `shipped` |
| `delivery_exception` | `delivery_exception` |
| `delivery_confirmed` | `delivered` plus delayed `review_request` |
| `refund_processed` | `refund` |

Delivery confirmation updates `deliveryVerified=true` only after evidence passes the delivery-source policy. The delayed review request still passes through the strict execution-time email bridge, which re-checks suppression, consent and delivery evidence before any send.

## Email remains independently gated

Queue projection does not activate customer messaging. Email delivery remains disabled unless `AUTOMATION_EMAIL_DELIVERY_ENABLED=true` and the strict delivery bridge, database delivery ledger, recipient resolver and Resend configuration are all available.

This separation lets order and fulfillment evidence be recorded safely before live communication is enabled.

## Explicit exclusions

This automation does not:

- create or submit supplier orders
- invent carrier or delivery evidence
- infer marketing consent
- send a review request before verified delivery
- retry an uncertain external side effect blindly
- publish products
- mutate live Stripe objects
- activate paid infrastructure
