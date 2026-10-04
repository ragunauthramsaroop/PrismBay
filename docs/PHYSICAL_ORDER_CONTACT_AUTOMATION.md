# PrismBay Physical-Order Contact Automation

This layer connects a verified paid physical Checkout event to the durable commerce automation queue without placing raw customer email in the physical-order ledger, queue payloads, logs or analytics.

## Default state

Projection is disabled unless `PHYSICAL_ORDER_AUTOMATION_ENABLED` is exactly `true`.

Enabling projection requires two independent 32-byte secrets:

- `AUTOMATION_CONTACT_VAULT_KEY` encrypts customer email at rest with AES-256-GCM.
- `AUTOMATION_RECIPIENT_REF_KEY` derives a stable de-identified `recipientRef` with HMAC-SHA-256.

Each secret must be encoded either as 64 hexadecimal characters or 43 base64url characters representing exactly 32 bytes.

The physical-order service already requires confirmed persistent storage in production. The contact vault and durable automation job file live under that same `DATA_DIR` when projection is enabled.

## What gets projected

Only verified Stripe `checkout.session.completed` and `checkout.session.async_payment_succeeded` events are eligible. The Checkout Session must be a positive USD payment and the existing physical-order ledger must already show the matching session as paid and `manual_fulfillment`.

After the physical order ledger commits, the bridge:

1. captures the normalized customer email into the encrypted contact vault
2. derives a stable `recipientRef`
3. creates the canonical `payment_completed` commerce automation event
4. enqueues the deterministic `order_received` email job through the existing commerce automation runtime

Stripe event replay is safe. The same event/session produces the same logical job and the durable job store suppresses duplicate insertion.

A structurally valid paid order with no customer email remains processed as an order but skips communication projection. Storage, encryption or durable queue failures return a processing failure so Stripe can retry the webhook; on replay, the existing order ledger result is reused and projection is attempted again idempotently.

## Contact vault privacy model

The vault stores customer email only as AES-256-GCM ciphertext with a random 96-bit IV and authenticated additional data bound to the `recipientRef`. The queue receives only the de-identified reference.

A newly captured paid checkout starts with:

- `transactionalAllowed: true`
- `marketingConsent: false`
- `deliveryVerified: false`
- `suppressed: false`

Repeated Checkout events do not overwrite later consent, suppression, delivery or authorization changes. Evidence updates are explicit boolean changes through the vault API.

A purchase is not treated as marketing consent. Abandonment recovery therefore remains blocked unless a separate authoritative consent event updates the contact state. Review requests remain blocked until verified-delivery evidence is recorded.

## Email delivery remains separately gated

Queue projection does not send email. The strict sender remains disabled unless `AUTOMATION_EMAIL_DELIVERY_ENABLED=true`, and the execution-time sender must resolve the `recipientRef`, re-check suppression and consent, reserve the strict delivery ledger, render the existing PrismBay Clean template and use the existing Resend transport.

This separation permits safe order/event automation without turning on customer messaging before the recipient resolver, delivery ledger migration, Resend configuration and internal test-recipient verification are complete.

## Key rotation

The encryption key and recipient-reference key have different roles and should be rotated separately.

Changing `AUTOMATION_CONTACT_VAULT_KEY` requires decrypting and re-encrypting existing vault records under a controlled migration. Changing `AUTOMATION_RECIPIENT_REF_KEY` changes recipient references and therefore requires migrating the vault plus any queued references. Do not rotate either key by simply replacing the environment variable while records remain active.

## Explicit exclusions

This automation does not place supplier orders, create or modify Stripe objects, infer marketing consent, publish products, retry uncertain irreversible operations, or activate paid infrastructure.
