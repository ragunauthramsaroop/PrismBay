# Whop forensic launch team

This directory integrates four narrowly scoped specialist role profiles into PrismBay's existing GitHub Copilot-compatible agent system. The roles adapt concepts from the MIT-licensed [Agency Agents](https://github.com/msitarzewski/agency-agents) by AgentLand Contributors, copyright 2025.

Source roles:
- [Payments & Billing Engineer](https://github.com/msitarzewski/agency-agents/blob/main/engineering/engineering-payments-billing-engineer.md)
- [Code Reviewer](https://github.com/msitarzewski/agency-agents/blob/main/engineering/engineering-code-reviewer.md)
- [SRE](https://github.com/msitarzewski/agency-agents/blob/main/engineering/engineering-sre.md)
- [Multi-Agent Systems Architect](https://github.com/msitarzewski/agency-agents/blob/main/engineering/engineering-multi-agent-systems-architect.md)

The source is offered under the MIT License. License text: https://github.com/msitarzewski/agency-agents/blob/main/LICENSE. Attribution and notice are retained here; do not imply endorsement by the source maintainers.

## What actually runs

GitHub Actions runs `scripts/whop-agency-forensic-audit.mjs` and its offline tests on a GitHub-hosted runner. The four role-specific outcome sections in the report are **deterministic checks**, not four separately running AI models. The `*.agent.md` profiles are available to GitHub Copilot coding agent if enabled by the repository owner; the pipeline does not secretly incur inference usage or grant agent tokens.

### Role routing

1. Payments & Billing: exact $19 one-time checkout, Whop account payout eligibility. No charge simulation.
2. Entitlement Security: unauthenticated paid ZIP URL test where configured; exact buyer and free member remain UNKNOWN until independently verified.
3. Checkout SRE: unauthenticated checkout page and public storefront health without cookies.
4. Release Reviewer: blocks go-live until all access and payout evidence is known.

### Safe invocation

- GitHub Actions → **Whop agency forensic release gate** → Run workflow on `main`. Also scheduled once per day.
- `WHOP_COMPANY_API_KEY` secret and `WHOP_COMPANY_ID` Actions variable are already connected. Never store them in code or issues.
- Optional `PRISMBAY_WHOP_ANON_FILE_URL` Actions secret must contain a current real Whop-managed file URL, not the product checkout or generic Files app page. Do not guess it or use a signed URL as proof of *member* entitlement.
- The workflow prints only sanitized status codes and decision labels. No customer payments, account changes, private buyer ZIP, customer data or signed URL is transferred to GitHub.

### Actual remaining risk

Whop Files supports product-specific access but the admin-mode Public preview still showed the ZIP filename. No independent signed-out visitor, free-product member, or genuine authorized paid user has tested the ZIP download. Whop company API key currently receives HTTP 403 on its account-payout metadata endpoint. Its one-time $19 checkout metadata exists, but bank payout readiness is unknown. Existing Stripe payout status does not prove Whop payout status. The product must remain Hidden.

Whop reference: https://whop.com/blog/whop-files-app/
Whop payout verification reference: https://whop.com/blog/global-payouts-api/
Whop payout settings: https://docs.whop.com/manage-your-business/manage-payouts/set-up-payouts
Release evidence: https://github.com/ragunauthramsaroop/PrismBay/issues/548

## Files experience association audit

Whop product attachment is independently checked through read-only GET /experiences, filtered by paid and free product IDs. HTTP 403 means insufficient API permissions, not a proven vulnerability.

A verified Files association to the $19 product with no free-product association is evidence of configuration. A signed-out visitor test and real buyer fulfillment remain required.

Script: scripts/whop-files-experience-audit.mjs. Test: scripts/whop-files-experience-audit.test.mjs.

Whop Files app ID: app_5UWRrs7haZZeiQ.
Reference: https://docs.whop.com/api-reference/experiences/list-experiences