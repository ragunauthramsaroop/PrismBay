# PrismBay Commerce Event Taxonomy

This document defines the privacy-safe commerce analytics contract for PrismBay Clean.

## Source and license provenance

The event-modeling approach is inspired by the open-source portions of [PostHog](https://github.com/PostHog/posthog). PostHog content outside its separately licensed `ee/` areas is available under the MIT-Expat license. PrismBay does not vendor PostHog source code here. The implementation in `scripts/commerce-event-taxonomy.mjs` and `scripts/commerce-event-adapters.mjs` is original PrismBay code.

The repository-level source boundary is also recorded in `config/oss-commerce-sources.json`.

## Hard privacy rules

Commerce analytics must not contain customer email, phone, IP address, street address, ZIP/postal code, card/payment-method data, tokens, raw customer identifiers, Stripe session IDs, or PostHog-style distinct IDs. Query strings are stripped from paths. Search terms are represented only through aggregate metadata such as query length and result count.

Live revenue remains authoritative only after a verified Stripe paid transaction. An analytics event never creates, proves, or upgrades a sale.

## Events

The v1 taxonomy covers product views, search, checkout intent/start/blocking, verified payment completion signals, order processing, supplier acceptance, shipment/tracking, delivery and delivery exceptions, review requests/submissions, abandonment eligibility, refunds, and repeat purchase signals.

## Provider behavior

The default adapter is a no-op. It validates and sanitizes events but sends nothing. A provider-compatible adapter requires explicit enablement plus an injected capture function. No API key, endpoint, customer data, or paid service is configured by this module.

## Operational use

Event names and properties are designed for funnel and lifecycle analysis while remaining compatible with the repository's existing aggregate commercial-signal controls. Any future live provider deployment must preserve this privacy contract and must be independently verified before PrismBay claims live analytics coverage.
