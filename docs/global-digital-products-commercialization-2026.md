# Global Digital Products, 24 October 2026

Status: ten original review prototypes, one free public sample and three original 24-second video drafts. NOT ten live commercial products.

## Demand research

Public marketplace evidence is mostly U.S. keyword search and listing data, not a globally measured usage ranking. As of 8 October 2026, published Semrush snapshots show monthly U.S. search interest for printables (165,000), Google Sheets templates (18,100), Canva templates (14,800), Framer templates (12,100) and Notion templates (22,200). These are different search terms and should not be summed. Source: https://www.keepertax.com/posts/digital-products-to-sell

Published sample of Gumroad Discover listings dated 9 October 2026: paid templates median $7, ebooks median $14.99, courses median $29. These represent listed asking prices, not verified transaction prices. Source: https://ceotudent.com/en/digital-product-price-benchmarks-2026-courses-templates-ebooks

Products with functional utility, including spreadsheet calculators, real professional templates and role-specific workflow packs, have a stronger practical differentiation opportunity than generic decorative downloads. Source: https://stealwhatworks.com/blogs/news/etsy-digital-products-selling-best-now

## Ten original PrismBay opportunities

1. Cashflow Studio, $5.99, an editable sample cashflow worksheet.
2. 30-Day Social Content Planner, $6.99, editorial calendar with 30 starter rows.
3. Professional Application Tracker, $7.99, location eligibility and application tracking.
4. Weekly Focus Planner, $4.99, a priorities and review worksheet.
5. AI Workflow Quality-Control Kit, $9.99, source and approvals tracker plus example prompt.
6. Small Business Proposal Toolkit, $9.99, scope tracker and proposal outline.
7. Service Pricing Workbook, $5.99, a cost/contingency/margin calculation worksheet.
8. One-Page Business Website Starter, $14.99, a mobile-responsive HTML template.
9. Minimal Business Icon Kit, $4.99, six original SVG assets.
10. Practical Microcourse Planner, $19.99, a lesson and assessment worksheet.

Prices are hypotheses for customer testing, not active checkout prices. Each prototype needs editorial expansion, usability testing, accurate disclosure, consumer terms, and verified paid fulfillment before public commercial launch.

## Reuse instead of rebuilding

PrismBay already has an executive digital storefront at https://clean.prismbayai.com/digital/ with four previously established Stripe payment links at $49, $99, $79, and $179. Its existing README reports downloadable packs, but also acknowledges order-bound delivery hardening and live paid end-to-end tests remain unresolved. Preserve the present offers. Reuse the existing checkout and order service when a new product is approved, rather than duplicate the merchant system.

The free sample at /digital/free-pricing-calculator.html is a browser-only pricing worksheet. The underlying formula is estimated price = (hours * internal cost per hour + direct expenses) * (1 + contingency percentage) / (1 - target gross margin percentage). The tool exports the estimate as CSV and sends no data to a server.

## Open-source assessment

- Existing PrismBay Node, Python and GitHub Actions serve as the primary automation layer.
- FFmpeg renders and verifies original 9:16 review videos. Its LGPL/GPL obligations depend on the binary build. https://ffmpeg.org/legal.html
- Postiz is AGPL-3.0. Self-hosting may support scheduling after account-specific authorization, review of the AGPL obligations, OAuth setup and developer approvals. Do not embed Postiz source into proprietary PrismBay commerce. https://github.com/gitroomhq/postiz-app
- Medusa core is MIT-licensed, but replacing the existing storefront would add complexity before proof of demand. https://github.com/medusajs/medusa
- Remotion licensing varies by entity size and use. The existing FFmpeg route avoids new video software license commitments. https://www.remotion.dev/docs/license/pricing
- Canva permits original design sales but restricts standalone stock asset resale. This project uses entirely original data, shapes and assets. https://www.canva.com/help/using-canva-to-create-products-for-sale/

## How to run

1. Run node --test scripts/digital-product-factory.test.mjs.
2. Run node scripts/digital-product-factory.mjs to generate ten original review packages.
3. With Pillow, FFmpeg and ffprobe available, run python3 scripts/render-digital-product-previews.py for three vertical original media previews.
4. The new GitHub Actions review workflow uploads downloadable artifact ZIPs for the ten packages and three videos. The workflow does not publish listings or posts.
5. Review each source package and clip for accuracy, license, accessibility, usefulness and presentation quality.
6. Connect approved paid product SKUs to secure account-linked checkout and expiring order-bound fulfillment. Complete a genuine end-to-end purchase and retrieval test before marking any new paid listing active.
7. Use the repository's official TikTok/YouTube publishing adapters only after channel-specific editorial clearance, authorized OAuth and deduplication checks. The educational AI YouTube channel must remain separate from retail promotions.
8. Track verified visits, opt-ins, checkout starts, completed paid transactions, payment fees, refunds and contribution margin. No outcome is assumed from code or an automation run.

## Unit economics illustration only

100 completed sales at $5.99 would equal $599 gross, excluding all fees, refunds, taxes, production, support and marketing. No such sales have been verified. A hypothetical $19.99 bundle needs testing for buyer value and economics before it is sold.

## Release gates

The project deliberately labels each new item as a prototype not for sale and each generated clip as review only, unpublished. Do not publish unverified claims, use private company materials, claim sales, or present a proposed price as an active offer.
