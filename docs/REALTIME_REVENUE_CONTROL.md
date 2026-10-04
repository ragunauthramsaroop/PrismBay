# PrismBay Clean real-time revenue control

PrismBay Clean uses event-driven GitHub workers plus scheduled control loops.

## Operating cadence

- `PrismBay Paperclip Commerce Group` runs every 15 minutes and after key commerce workflows complete.
- `Claude Free GitHub Cloud Agent` responds to owner comments on `[CLAUDE-CLOUD]` and `[AI-COUNCIL]` issues.
- ChatGPT Revenue Ops supervises the system hourly, which is the fastest supported ChatGPT task cadence.
- TikTok retail publishing remains daily and only after product, media-rights, checkout, fulfillment and platform gates pass.

## Real-time rule

When a worker posts a result, the coordinator should immediately convert the result into the next concrete action: code branch, test, pull request, review, merge-ready recommendation, verified external action, or a precise blocker requiring owner input. Do not wait for a later strategic review when the next safe action is already known.

## Boundaries

Do not bypass identity, KYC, supplier, freight, payment, spending, platform, security, privacy, consent, contractual or media-rights controls. Do not claim a sale unless a live Stripe paid transaction exists. Do not publish unverified physical products or fabricated reviews, stock, scarcity, discounts, delivery promises or performance claims.
