# CaribContract Atlas | independent venture pilot

CaribContract Atlas is a distinct product and brand from PrismBay. Its files are currently stored in this existing public repository to avoid creating paid infrastructure. The commercial business, if registered and approved, belongs to the human owner or an authorized legal entity. An AI assistant is not its legal owner, merchant of record or bank-account holder.

## Customer problem
Caribbean suppliers and contractors spend time checking public procurement portals for relevant opportunities, new notices, closing dates and requirements. The pilot supplies original normalization and a free bid-readiness checklist, always linking to official sources.

## Initial service
- Official source: https://eprocure.gov.gy/, publicly launched February 24, 2026.
- Coverage: six source-linked Guyana tender examples from the November 5, 2026 public portal snapshot. This is NOT a continuously updated paid feed.
- No exclusive tender rights, bid submissions, bidder qualification decisions, professional advice or contract-award guarantees.
- Separate prospect database under existing free Floot account, with consent and duplicate-email protection. Lead details must never be committed to this repository.
- Independent web pilot routes: /caribcontract-atlas and /caribcontract-pilot in existing Floot project Zero-Cost Revenue Gateway. Staged until the owner confirms publication to its existing domain; its native-mobile app must remain backward-compatible.

## Operating model
1. Read-only Source Scout monitors one official public page at most daily. Saves short-lived unreviewed candidates as a GitHub Actions artifact, not directly to the customer-facing list.
2. Quality Guardian validates record shapes, dates, source provenance, deduplication, freshness and classification.
3. Offer Validator evaluates actual consenting business requests. No fake buyers or public PII.
4. Revenue Guardian reports paid subscriptions only after authenticated Stripe paid events, entitlement checks, cancellations and applicable refunds.
5. Publisher must use appropriate commercial hosting. Do not host a commercial storefront on GitHub Pages.

## Hypotheses to test
- Initial market: small construction and equipment suppliers serving Guyana, then English-speaking Caribbean.
- Price hypothesis: USD 29 / month for category-matched briefs and opt-in alerts. This is NOT a live paid plan.
- First milestone target: 10 genuinely interested businesses, 3 useful feedback conversations, and one successful non-test paid subscription after approved release. These targets are not achieved results.

## Boundaries
- No new paid subscriptions, paid ads, inventory, supplier purchases, unsolicited outreach or automatic bids.
- No scraping behind login, CAPTCHA evasion, excessive crawling or unsupported rights claims. Stop if the official source prohibits extraction.
- No customer data, account tokens, private financial records or email addresses in public GitHub.
- Do not report profitability until all processing fees, taxes, refunds, support and hosting costs are reconciled.
- Keep educational YouTube, PrismBay retail and personal executive identities separate.

## Evidence and limitations
Initial notice snapshot is transcribed from the official public portal and is time-limited. Source Scout intentionally produces candidates only. Nothing auto-publishes a new tender without review. A successful GitHub Action is not a sale.

## Local commands
From this folder, npm test checks offline record validation and business gates. npm install and npx playwright install chromium prepare the optional source monitor. npm run scout performs a read-only official portal scan and writes output/latest-candidates.json.
