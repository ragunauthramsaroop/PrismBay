# PrismBay Lifecycle Journey Provenance

## Open-source reference

The dry-run journey engine is inspired by customer-journey concepts from [Dittofeed](https://github.com/dittofeed/dittofeed), whose open-source repository is MIT licensed. PrismBay does not vendor Dittofeed source code or add Dittofeed as a runtime dependency. The implementation in `scripts/lifecycle-journey-engine.mjs` is original PrismBay code.

## Existing PrismBay paths remain authoritative

The engine does not create a new sender or fulfillment pipeline. Existing PrismBay email, physical-order, supplier, checkout and commercial authorization controls remain the only live execution paths. The engine only evaluates who would be eligible for a message and writes a de-identified dry-run report.

## Safety gates

- Abandonment recovery requires explicit consent evidence.
- Review requests require delivery evidence and consent.
- Unsubscribed, bounced and complained recipients are suppressed before timing rules are evaluated.
- Message idempotency is keyed to journey, normalized recipient and template, while output exposes only hashes.
- No raw email is written to the dry-run report or console summary.
- Live sending remains disabled by this module.
- Supplier ordering remains disabled by this module.

Any later activation must reuse the existing sender and fulfillment paths and requires independent production verification.
