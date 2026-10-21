# PrismBay Agency Agents Commerce Autopilot

## Purpose
This implementation adapts six specialist roles from [Agency Agents](https://github.com/msitarzewski/agency-agents) to the existing PrismBay Clean business. It **does not** fork or install 200 agent runtimes and **does not** replace the production commerce controller. The upstream project supplies role descriptions, not a hosted autonomous operations service. Existing PrismBay product verification, first-sale recovery, storefront health, Stripe reconciliation and eBay control workflows remain authoritative.

## Scope and schedule
Workflow: `.github/workflows/agency-agents-commerce-autopilot.yml`.
It runs four times daily (01:29, 07:29, 13:29 and 19:29 UTC) and supports manual dispatch. Tests run on each associated pull request without launching a model.

The deterministic evidence adapter `scripts/agency-agents-commerce-brief.mjs` reads the committed CJ supplier review and dropshipping workboard, checks the dates (less than 30 hours old), selects one specialist by six-hour rotation and creates an evidence-limited prompt and a JSON accountability report. Inputs never include passwords, customer records, bank accounts, unpublished files or private Stripe details.

An existing cloud-only `claude-9router-auto.mjs` integration attempts one read-only AI advisory review using a currently advertised free-model route. If the free route is unavailable, the generated evidence report is retained and the workflow identifies the model failure explicitly. The model writes its answer only to a short-lived Actions artifact and cannot push code, update orders, send email or publish. This is AI advisory autonomy, **not** unattended transactional autonomy.

## Role roster
| Role | Upstream role | PrismBay assignment |
| --- | --- | --- |
| Supplier and Fulfillment Auditor | `specialized/operations-manager.md` | Missing supplier identity, variant stock, final buyer-ZIP freight and rights evidence |
| Product Trend Researcher | `product/product-trend-researcher.md` | Research and supplier-independent product alternatives |
| Storefront Conversion Reviewer | `marketing/marketing-growth-hacker.md` | Product-page, mobile and checkout-preflight experiment proposals |
| Organic Search Strategist | `marketing/marketing-seo-specialist.md` | Verifiable buyer guides, search intent and technical SEO |
| Retail Video and Creator Strategist | `marketing/marketing-tiktok-strategist.md` | Original rights-safe PrismBay Clean creative concepts, no educational YouTube retail promotion |
| Autonomous Operations Reviewer | `specialized/automation-governance-architect.md` | KPI accountability, workflow bottlenecks and failure recovery proposals |

Original work is copyright its respective authors; this adaptation references upstream role files rather than copying agent prompts. Consult the upstream MIT license for use and redistribution of its original text.

## Existing workflow control remains in force
- CJ verification remains `.github/workflows/cj-supplier-verification.yml`.
- Existing growth and workboard refresh remain `.github/workflows/free-cloud-ops.yml`.
- CEO recovery, prioritization and commercial resilience stay in `.github/workflows/ceo-autonomous-recovery.yml`.
- Existing YouTube publishing guard and PrismBay Clean TikTok account authorization stay separate.
- For a product to progress toward a live checkout, all supplier identity, exact variant inventory, shipping ZIP, merchant economics, media rights, return/disclosure and payment preflight evidence must remain valid. A new agent report cannot override any gate.
- No advertising spend, cold outreach, supplier orders, price changes, payments, production deployment, customer messages, social publishing or code merges follow directly from this advisory workflow.

## Evidence and acceptance
Run `node --test scripts/agency-agents-commerce-brief.test.mjs` and `node scripts/agency-agents-commerce-brief.mjs`.
After merge, inspect **Actions > PrismBay Agency Agents Commerce Autopilot**, its latest job summary and `prismbay-agency-agents-` artifact. Verify the selected specialist, supplier-review date and exact model outcome. A passing workflow is proof of research execution, not a sale, functioning external channel, fulfilled order or verified payment.

To deepen autonomy later, require a separately reviewed implementation of each external action with scoped credentials, idempotency, immutable event records, rollback, tests and affirmative owner-approved spending limits. Never grant the upstream personas blanket production credentials.
