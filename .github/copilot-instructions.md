# PrismBay GitHub Agent Instructions

## Mandatory YouTube channel boundary

PrismBay AI YouTube channel `UCw2hs85TzIpdKwJtG-BSxzQ` is **educational AI-business content only**. PrismBay Clean commerce and TikTok workers are separate and may never send retail-product promotions to this YouTube channel. The commerce-first priority below applies **only to the retail workstream**, not to this YouTube channel.

YouTube publishers must use `scripts/youtube-publishing-guard.mjs` through the authenticated `scripts/youtube-publishing-gateway.mjs` adapter, or an approved K1 Studio preflight receipt issued by `scripts/youtube-publishing-preflight.mjs`. Validate exact Metricool brand `6945443` and connected channel, original media/checksum, editorial fit, minimum four-hour spacing, and similarity against published and pending content using a fresh (<2 minute) queue snapshot. Never treat a Metricool UUID as the creative identity: a previously edited post reused a UUID for different footage. Reserve publishing attempts durably and never automatically retry an uncertain publication. A disconnected adapter, missing receipt, outdated queue, or failed check **blocks YouTube publication**, not research, video production or separate commerce activity. No worker may directly call Metricool/YouTube/Studio to bypass these controls.

The K1 Studio gate installer is `node scripts/install-youtube-studio-gate.mjs`. Run `node scripts/install-youtube-studio-gate.mjs --check` to detect tampering/drift. A controller cannot intercept other accounts or independent third-party publishers; restrict their authorization to achieve platform-wide enforcement. Never put OAuth credentials, browser cookies, video files or private preflight snapshots in the public repository.

PrismBay Clean / TikTok commerce is the first growth priority until native TikTok Shop is active and verified external revenue exists.

## Operating rules
- Coordinate with the existing Portfolio Sales & Fulfillment controller; do not duplicate fulfillment or customer-order actions.
- Use zero-cost methods by default. Do not provision paid services or incur spend without explicit approval.
- Never fabricate views, sales, testimonials, scarcity, rankings, creator endorsements, product specifications, or supplier facts.
- Internal/test traffic is not demand and must never be reported as revenue.
- Use supplier-authorized media or original non-deceptive generated assets only.
- No fake IDs, nominee identities, account rentals, region spoofing, deceptive engagement, or spam.
- Do not expose tokens, credentials, environment values, customer data, or private correspondence.

## Worker roles
Every growth run should produce a concrete result from one or more of:
Trend Scout, Hook/Creative Writer, Storefront CRO Auditor, Creator/Partner Scout, Publisher, Analytics Reviewer, Offer Optimizer, GitHub Support Scout.

## Current commerce scope
Current Top 10:
1. Cordless Pressure Washer
2. Cordless Handheld Vacuum
3. 5-in-1 Electric Spin Scrubber
4. Mattress Vacuum
5. Portable Garment Steamer
6. Portable Home Caddy
7. Reusable Pet Hair Remover
8. Self-Squeeze Mini Mop
9. 3-in-1 Crevice Cleaning Brush
10. Sink Drain Catcher 2-Pack

Canonical PrismBay Clean retail storefront: https://clean.prismbayai.com/
Retail product research landing page: https://clean.prismbayai.com/top-15/
PrismBay AI educational site: https://www.prismbayai.com
Do not direct retail traffic to historical AppDeploy or unverified shop subdomains. Confirm live HTTPS and approved product/digital delivery gates before linking a commercial offer. Retail TikTok must be connected and separately authorized before any scheduling or publication.

Run a role with:
`node scripts/organic-growth-agent.mjs "Storefront CRO Auditor"`

Run the full local/K1 swarm with:
`powershell -ExecutionPolicy Bypass -File scripts/run-growth-swarm.ps1`

Treat live publication, creator replies, checkout activity, verified Stripe sales, and native TikTok Shop progress as measurable outcomes. Do not infer outcomes from generated artifacts alone.

## Viral candidate pipeline
- Run `node scripts/viral-product-engine.mjs` to re-rank live approved products.
- Run `node scripts/viral-candidate-engine.mjs` to refresh new product candidates.
- `public/viral-candidates.json` is the auditable discovery feed. `growth-reports/viral-promotion-queue.json` is the commercial staging queue.
- Prefer practical home, cleaning and organization products with clear short-video demonstrations.
- A candidate must not become a live offer from attention data alone.
- Supplier promotion requires an authenticated CJ route, on-sale status, verified US inventory, and product checks.
- Freight validation must occur before a new checkout price is treated as ready.
- Use the official CJMCP integration when available for supplier search, SKU details, freight, logistics timing and order creation.
- Never publish supplier media unless its usage is authorized for the selling account.
- Keep weak or unverified candidates in research status and never present them as products already sold by PrismBay.
