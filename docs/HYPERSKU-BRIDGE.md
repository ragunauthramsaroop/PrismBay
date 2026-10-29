# HyperSKU — PrismBay Clean, zero-subscription manual fulfillment

## Supplier decision (28 October 2026)

A response provided to the owner from Georges at HyperSKU states that **Open API is not available to a new low-volume custom storefront** and suggests a 2,000 MOV account qualification threshold. This threshold has not been independently verified in the public documentation. Do not represent HyperSKU API access as active.

**PrismBay remains a custom GitHub Pages store.** No Shopify subscription or unapproved replatforming is needed. Manual product research and order fulfillment may be possible, subject to the specific merchant account's permissions.

## Official documentation

- Product sourcing: https://support.hypersku.com/en/articles/3161590-how-can-i-submit-a-sourcing-request-and-get-a-quote-on-hypersku
- Manual Excel order import: https://support.hypersku.com/migration/en/articles/3297862-import-orders-manually-by-uploading-excels
- Product variant SKU lookup: https://support.hypersku.com/en/articles/3295483-look-up-sku-codes-for-products
- Shipping address requirements: https://support.hypersku.com/en/articles/3970217-provide-accurate-shipping-addresses

**Important discrepancy:** Georges refers to manual **CSV** batch import. The public official guide describes an **Excel import template** downloaded from Orders > Order List > More > Import File. Do **not** generate or submit a guessed CSV column schema. Download the actual account template and confirm its permitted format.

**Second blocker:** The official sourcing guide says to connect a store before sending AliExpress sourcing URLs; this merchant is using an unsupported custom GitHub Pages storefront. The owner must confirm with the HyperSKU agent that Smart Sourcing and manual Excel order import are enabled **without connecting Shopify, WooCommerce or another platform**.

## Free sourcing workflow

1. In HyperSKU dashboard, go to **Sourcing > AliExpress Sourcing**. Submit genuine, direct AliExpress item links, one URL per line; no affiliate parameters or shortened URLs. Actual sourced quotes appear under **Sourcing > Smart Sourcing**.
2. HyperSKU's official Help Center says three daily sourcing requests, but its published pricing page states **three free requests per 48 hours**. Georges additionally claimed ten free links per week and US$1 per extra link. To avoid unexpected paid requests, the GitHub queue enforces **both** three daily and three per rolling 48 hours, plus ten per rolling seven days. Quotes are generally expected in about two business days. Confirm actual limits with the agent before submission.
3. Record shortlist URLs and submit timestamps in `config/hypersku-sourcing-queue.json`. `node scripts/hypersku-sourcing-queue.mjs` and the automated tests reject invalid, duplicated, non-direct, or above-quota submissions. Nothing submits from GitHub automatically.
4. Review exact supplier SKU, variant, size, product image rights, stock, buyer ZIP shipping, processing time, shipping time, refund and return terms, and landed margin. A provided product picture is not sufficient.
5. Only after the manual import route has been authenticated in the merchant dashboard and individual product evidence passes `scripts/alternate-supplier-readiness.mjs` may an actual product appear on the **quote-only** public catalog. Physical checkout and ordering stay disabled.
6. After separately approved customer payment and operator purchase funding, export orders using the **actual HyperSKU account's Excel template**. Keep customer names, contact details, addresses and source order rows out of public GitHub, artifacts, issues and workflows. Do not upload any real customer order yet.
7. Operator imports via **Orders > Order List > More > Import File**, reviews the preview, explicitly submits and pays supplier, retrieves the real tracking number and sends legitimate order updates.

## Current GitHub implementation

- `config/alternate-supplier-evidence.json` — honest account/API/manual-status registry.
- `scripts/hypersku-github-bridge.mjs` — API readiness checks (API is blocked at low volume; a green CI means tests pass, not an active supplier connection).
- `scripts/alternate-supplier-readiness.mjs` — allows either proven API-sourced or individually verified manual-sourced products **only after merchant-account manual import eligibility is confirmed**. No live supplier claims exist.
- `scripts/top15-real-source-sync.mjs` — verified HyperSKU products can appear even if CJ checks expire; no speculative items or photos.
- `config/hypersku-sourcing-queue.json` — genuine AliExpress link and no-fee quota register, initially empty.
- `.github/workflows/alternate-supplier-readiness.yml` — automated sourcing-queue and supplier readiness validation.
- https://github.com/ragunauthramsaroop/PrismBay/issues/505 — onboarding issue.

## The two questions that unblock the merchant

1. **Can Georges enable Smart Sourcing and the manual Excel order-import tool for our existing custom website with no platform connected?** If yes, where is the menu in the merchant dashboard?
2. **Can Georges supply the exact Excel template and a non-payment demo import for a custom-store order?** This must never create or pay for a real supplier order.

No auto supplier orders, no API key requests, no paid sourcing credits, no subscriptions, no customer data in GitHub, no advertising and no unverified physical checkout.
