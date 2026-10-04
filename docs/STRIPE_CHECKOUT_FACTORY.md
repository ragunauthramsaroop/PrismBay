# PrismBay Stripe Checkout Factory

## Purpose

This foundation prepares PrismBay Clean to move from manually managed Payment Links toward a scalable Checkout Session model for a large catalog without weakening the existing supplier, stock, destination-freight or economics gates.

## Existing gates stay authoritative

The factory accepts only an authorization object that already confirms checkout approval plus fresh stock, shipping and economics revalidation. It does not perform supplier verification, freight calculation or commercial approval itself. Those remain in the existing physical-order quote and checkout authorization path.

A Stripe Price ID is required. The factory never creates Products or Prices. Existing live Payment Links remain unchanged.

## Open-source provenance

The parameter shape and hosted-Checkout pattern are inspired by Stripe's official `stripe-samples/checkout-one-time-payments` repository, licensed under MIT. PrismBay's implementation is original and does not vendor sample source code.

## Metadata and privacy

Checkout metadata is limited to the PrismBay commerce schema, SKU, a hashed quote reference and a non-PII correlation ID. Buyer address, ZIP, email, phone, card details and supplier secrets are not added to metadata.

## Test-mode and production boundary

`buildCheckoutSessionParams` creates a parameter object and idempotency key only. It does not call Stripe. Live Stripe Session creation, Product/Price creation, Payment Link changes and supplier ordering remain separately gated. The existing four live Payment Links are not modified by this work.

## Catalog scaling

The price-index helper reads already-verified Stripe Price mappings from the physical catalog. The current catalog contains multiple internal verified mappings, but a Price mapping alone does not make a product sale-ready. Store publication remains controlled by the catalog's full SALE_READY gates.
