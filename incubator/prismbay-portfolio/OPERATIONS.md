# PrismBay Internal Agent Operations (planned)

Scope: reusable internal assistance for the 19-product incubation programme. These are not authorised background publishing, spending, scraping, outbound emails or checkout processes. The existing PrismBay SaaS Builder and repository issue #544 remain the active coordination mechanism.

## Internal agent modules to develop

### 1. Opportunity & Demand Scout
Inputs: public problem statements, manually collected buyer objections, relevant marketplace conversations, and competitor pages.
Outputs: ranked problem hypotheses, citations, suggested interview questions, evidence gaps.
Controls: comply with access terms, no scraped private data, no unsupported worldwide demand or paid-user claims.
Metric: number of interviews and qualified lead signals, not the quantity of scraped posts.

### 2. Product Build Planner
Inputs: customer interview evidence, feature requests, current PRs, cost ceilings.
Outputs: small scoped tasks, acceptance tests, dependency analysis, weekly build order.
Controls: never self-merge, change repository permissions, deploy, or provision services.
Metric: user-tested features delivered and defects closed.

### 3. Quality & Release Auditor
Inputs: diffs, unit tests, UI previews, dependency manifests and permission matrix.
Outputs: regressions, risk findings, test receipts, release checklist with pass/fail evidence.
Controls: fail closed for billing and isolation regressions. Do not weaken safeguards or convert failing tests to warnings.
Metric: regression escapes and percent of release-gate checks independently passed.

### 4. Customer Support Drafting Agent
Inputs: owner-approved public policies and permissioned service tickets.
Outputs: cited draft replies, handoff reasons, likely product friction.
Controls: no autonomous customer replies or account/financial changes; redact sensitive data from logs and reports.
Metric: human-approved resolution time and repeat-contact rate.

### 5. Unit Economics & Retention Analyst
Inputs: privacy-filtered, verified provider invoices, actual Stripe/merchant subscription ledger, approved hosting usage.
Outputs: actual gross margin, active paying tenants, cancellations, churn cohorts and alerts.
Controls: never infer sales from generated content, pending checkout links or workflow runs. No payment writes.
Metric: net cash receipts, gross margin and true retained customers.

## Work allocation

The five modules should share a read-only event ledger, scoped credentials, permission-checked adapters and an evidence registry. They must not clone existing live retail, YouTube or recruiter automation. All actions affecting external systems require explicit owner approval.

## Separation of duties

- Research agents: read-only, sources and dates required.
- Draft agents: create internal artifacts, never deliver external communications.
- Quality agents: approve or block release proposals, never override owners.
- Financial agents: read-only verified ledgers, no transfers or payment changes.
- Deploy agents: dormant until separately authorised, no public URLs or automated promotion.

## Readiness gates

1. Local deterministic tests for individual workflows.
2. Threat-model and data privacy review per domain.
3. Test tenants with isolation, deletion and permission checks.
4. Monitoring and zero-spend budget guard.
5. Owner-reviewed deployment and customer validation plan.

Status: specifications only, not scheduled or connected to external accounts.
