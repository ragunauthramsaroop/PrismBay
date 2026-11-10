# PrismBay Clean | Whop physical-commerce guard

Status: DEVELOPMENT, NOT LIVE. No Whop merchant, payout, checkout, buyer payment or supplier order is inferred from this repository. Existing Stripe digital products and the current physical inquiry flow remain unchanged.

## What this release implements

- A dependency-free Node.js module that denies every Whop checkout by default.
- Requires each physical item to pass existing catalog gates before it is even eligible for Whop.
- Matches exact supplier SKU and variant, authentic buyer ZIP freight (not an illustrative ZIP), short-lived supplier quote, selling price, reserve and contribution margin.
- Requires a server-generated, order-bound Whop checkout ID and a strictly checked Whop checkout URL. A link never appears on a failed check.
- Matches a separately fetched Whop payment to a trusted pending order, account, plan, USD amount and order ID.
- Permits only human-reviewed fulfillment after payment reconciliation. Automatic supplier ordering stays disabled.
- CI read-only tests plus a catalog preflight based on the existing config/top15-merchandising.json.

## How to use the policy in the existing quote service

1. Reuse the server-side CJ verification and destination freight code in services/railway-clean-quote. Do not trust SKU, quote, ZIP approval, seller status or fee amounts supplied by a buyer's browser.
2. Store an approved, time-limited quote and pending order in a durable database with a unique opaque order ID. Store current exact supplier evidence and approved media/return policies.
3. Create a separate Whop sandbox account and verify account ownership, merchant eligibility, supported physical-product fulfillment and payout status using the seller dashboard. Do not infer approval from the existing Stripe account.
4. Create the exact physical product/plan and checkout configuration on the server in Whop sandbox, attach the pending order ID to Whop metadata, collect shipping address, and verify plan amount/currency. Use the official SDK where available. Never put API keys in public code or browser storage.
5. Recheck supplier inventory, exact variant, freight and economics immediately before redirect. Call inspectPhysicalOffer with ONLY trusted server-side inputs. Return a checkout link only for an approved result.
6. On receipt, verify the Whop webhook signature and replay window with the official SDK. Deduplicate event IDs in a durable transaction, then retrieve the payment independently via the Whop server API. Translate its verified fields to reconcileWhopPayment. Use atomic claim/commit semantics and recover uncertain deliveries. An in-memory Set is not durable enough for a multi-instance deployment.
7. Route a matching paid order to a human-reviewed fulfillment queue. Do not auto-create a CJ/HyperSKU/EPROLO supplier order. Reconcile supplier acknowledgement and tracking back to the buyer.
8. Test sandbox purchase, duplicate delivery, wrong plan, wrong amount, refund/dispute, abandoned checkout, missing shipping address, canceled order, repeated webhook and fulfillment exception. Verify live merchant/payout eligibility separately before considering production activation.

Official current developer guidance:
- https://whop.com/blog/integrate-checkout-api/
- https://whop.com/blog/whop-sandbox/
- https://whop.com/blog/add-checkout-to-nextjs-app/
- https://whop.com/network/solutions/physical-products/

## Important guardrails

- The public physical catalog currently sets physicalCheckoutPermitted=false and saleReady=false. This change does NOT lift those restrictions.
- Digital files already offered on Stripe and separately planned for Whop Files remain independent from physical orders.
- No new subscription spend. Per-order fees and supplier costs still require approval.
- Do not expose customer addresses, order records, seller API keys, refund data or supplier secrets in GitHub logs or reports.
- Product photos and videos require independently established commercial usage rights.
- Build an adapter only after a verified, connected Whop merchant identity and durable order store exist. The sample test payment objects are fictional fixtures, not actual Whop payment schema assertions.
