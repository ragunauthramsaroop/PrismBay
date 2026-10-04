# PrismBay Clean Transactional Email System

## Purpose

PrismBay Clean now has a branded transactional email renderer for order receipt, processing, shipment, delivery, delivery exceptions, refunds, abandonment recovery, and verified-review requests.

## Existing sender remains authoritative

The renderer does not create another email transport. `src/lib/email.ts` remains the single Resend sender. It now accepts optional HTML while retaining required plain-text fallback and the existing no-recipient/no-body logging rule.

## Open-source provenance

Layout and component ideas are inspired by [React Email](https://github.com/resend/react-email), which is MIT licensed. No React Email source code is vendored and no React Email runtime dependency is added by this work. PrismBay's implementation is original and uses inline, email-client-safe HTML plus plain text.

## Brand and trust rules

All templates use the PrismBay Clean identity and name STUDYSMARTZ LLC as operator. The templates avoid fake urgency, fake discounts, stock claims, fabricated social proof, or promises unsupported by fulfillment evidence. They state that card details are not requested by email.

Abandonment messages tell customers to check current availability instead of inventing a discount. Review requests state that reviews should be honest, require delivery evidence in the lifecycle engine, and provide no incentive for a positive rating.

## Activation boundary

This module only renders content. Live sending must continue through the existing `sendEmail` path and the existing campaign/idempotency controls. No live email is sent by the tests or by the template renderer itself.
