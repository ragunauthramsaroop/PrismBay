# PrismBay Portfolio: Product-by-product production build plan

## Operating decision

Store all ideas and offline proof-of-concept workflows in this branch. The demos are NOT customer-facing paid software. Build a single shared SaaS foundation rather than 19 separate payments, accounts and databases. No production site or services change without a separate approved release.

## Shared architecture

- Front end: reuse existing TanStack/React conventions after a codebase-specific integration review.
- Backend: tenant-scoped API, event audit and server-side provider adapters; no model keys in browser.
- Identity: verified customer sign-up, recovery, role permissions, session security and tenant boundary tests.
- Data: purpose-specific relational records with retention, export, delete and backups.
- AI: modular provider routing, input/output evaluation, spend limits, citations where needed and explicit human approval for high-stakes actions.
- Billing: one verified merchant-of-record path eligible for a Guyana-based operator; secure webhooks, idempotency, entitlement, cancellation and refunds.
- Operations: logging without private payloads, incident response, rate limiting, safety rules, cost ceilings and support workflows.
- Product lifecycle: idea -> prototype -> customer discovery -> private alpha -> monitored paid beta -> public release.

## Portfolio specifications

### 01. Cashflow Cloud (P0)

Buyer: Service SMEs.

- First customer-facing MVP: Invoice import, ageing, approved reminder drafts.
- Engineering extension: Customer accounts, invoice ledger, scheduled reminders.
- Mandatory release controls: Stripe merchant onboarding; isolation; finance reconciliation.
- Current prototype boundary: Link to existing issue #544 pilot, do not duplicate its implementation.

### 02. Document Intelligence (P2)

Buyer: Legal ops and SMEs.

- First customer-facing MVP: Upload text/PDF, source-indexed answers, audit trail.
- Engineering extension: Document ingestion, permission filters, retrieval evals.
- Mandatory release controls: PII redaction, deletion, exact citations, unsafe advice refusal.
- Current prototype boundary: Original demonstration uses simple supplied-text search.

### 03. Market Intelligence (P2)

Buyer: Product marketers.

- First customer-facing MVP: Competitor cards, cited price research, weekly change log.
- Engineering extension: Source retrieval pipeline, snapshot diff, scheduled insights.
- Mandatory release controls: Scraping rights, timestamps, citation and change evidence.
- Current prototype boundary: Original prototype compares manually provided competitors.

### 04. Customer Support (P1)

Buyer: Online merchants.

- First customer-facing MVP: Approved FAQ assistant, handoff queue, ticket history.
- Engineering extension: Knowledge-base RAG, inbox adapter, role-based escalations.
- Mandatory release controls: No autonomous refunds; opt-in communications; conversation privacy.
- Current prototype boundary: Current prototype does not message customers.

### 05. Opportunity Cloud (P1)

Buyer: Professionals and SMEs.

- First customer-facing MVP: Verified open opportunities, geographic fit, deadline tracking.
- Engineering extension: Search ingestion, source freshness, eligibility questionnaire.
- Mandatory release controls: Source validity, stale-link detection, fee transparency.
- Current prototype boundary: Fictional examples are labelled samples.

### 06. Global Careers (P1)

Buyer: International professionals.

- First customer-facing MVP: Visa/relocation/housing filters, employer source check.
- Engineering extension: Employer-site ingest, CV tailoring, private application tracker.
- Mandatory release controls: No unverified immigration claims; candidate consent.
- Current prototype boundary: Do not auto-submit applications or send bulk messages.

### 07. Bid Intelligence (P1)

Buyer: SME contractors.

- First customer-facing MVP: Tender repository, requirement extraction, bid/no-bid matrix.
- Engineering extension: Deadline monitor, evidence repository, proposal drafting.
- Mandatory release controls: Original tender terms authoritative; privileged files segregated.
- Current prototype boundary: Human approval before submitting bids.

### 08. Sustainability OS (P1)

Buyer: Industrial ESG teams.

- First customer-facing MVP: CSV meter inputs, emission factors, reporting exports.
- Engineering extension: Meter ingestion, factor versioning, site/period lineage.
- Mandatory release controls: Assurance-grade methodology and data-owner permissions.
- Current prototype boundary: Existing workbook templates are separate products.

### 09. Website Intelligence (P1)

Buyer: Local businesses and agencies.

- First customer-facing MVP: Page audits, accessibility checklist, repair queue.
- Engineering extension: Crawler with robots respect, issue evidence, screenshot comparison.
- Mandatory release controls: User-authorised scan limits, no unsupported SEO claims.
- Current prototype boundary: Current demo inspects pasted HTML only.

### 10. Recruitment Assistant (P2)

Buyer: Recruiters.

- First customer-facing MVP: Structured skills matrix, consented applicant notes.
- Engineering extension: ATS integration, interview scheduling, recruiter review.
- Mandatory release controls: Employment discrimination and privacy assessments; human decisions.
- Current prototype boundary: Never auto-reject applicants.

### 11. Dashboard Builder (P1)

Buyer: SMEs.

- First customer-facing MVP: CSV uploads, field mapping, core KPIs, export.
- Engineering extension: Saved charts, query engine, per-tenant data controls.
- Mandatory release controls: Spreadsheet injection tests and data lineage.
- Current prototype boundary: Current sample uses simple revenue and expense CSV.

### 12. Meeting Secretary (P1)

Buyer: Consultancies.

- First customer-facing MVP: Structured minutes, owner assignments, approval workflow.
- Engineering extension: Audio transcription optional, calendar and task integration.
- Mandatory release controls: Meeting consent, retention policy, no unsent communications.
- Current prototype boundary: Explicit decision/action labels drive offline sample.

### 13. Training Academy (P2)

Buyer: SMEs and coaches.

- First customer-facing MVP: Course outline, teacher-approved quiz bank, learner progress.
- Engineering extension: LMS, assessments, certificates and versioning.
- Mandatory release controls: Content rights; accredited claims need proof.
- Current prototype boundary: Current demo uses educator-provided facts only.

### 14. Property Research (P2)

Buyer: Agents and investors.

- First customer-facing MVP: Comparison spreadsheet, net yield and expense scenarios.
- Engineering extension: Listings ingestion, calculators, location data.
- Mandatory release controls: Source recency, financial disclaimer, licensing checks.
- Current prototype boundary: No claimed live inventory.

### 15. Travel Planner (P3)

Buyer: Travelers.

- First customer-facing MVP: Editable multi-day activity plan and budget.
- Engineering extension: Live official schedules, maps, flight links.
- Mandatory release controls: No invented rates or reservation inventory.
- Current prototype boundary: Current demo does not route or book.

### 16. Podcast Studio (P2)

Buyer: Creators and teams.

- First customer-facing MVP: Editorial script, source provenance, review queue.
- Engineering extension: Licensed TTS generation, asset library, publishing handoff.
- Mandatory release controls: Rights to source text, voice and media; consent.
- Current prototype boundary: Current demo returns text only.

### 17. Due Diligence Assistant (P2)

Buyer: Procurement teams.

- First customer-facing MVP: Evidence checklist, document recency and reviewer assignment.
- Engineering extension: Authoritative company registries, source audit logs.
- Mandatory release controls: Avoid allegations from incomplete data; human investigation.
- Current prototype boundary: Never claim a sanctions check without evidence.

### 18. Design Review Studio (P2)

Buyer: Design agencies.

- First customer-facing MVP: Contrast checks, accessibility checklist, screenshots.
- Engineering extension: Full component scanner, reproducible findings, QA tickets.
- Mandatory release controls: Accessibility audits require assistive-technology testing.
- Current prototype boundary: Current demo is a contrast and checklist sample.

### 19. Business Research Assistant (P2)

Buyer: Consultants.

- First customer-facing MVP: Evidence ledger, SWOT, report structure.
- Engineering extension: Web sources with citations, versioning and memo exports.
- Mandatory release controls: Avoid fabricated market figures, unsupported advice.
- Current prototype boundary: Current demo structures supplied statements.

## Proposed release order

Phase 0: validate 10 service-business leads for Cashflow Cloud and close issue #544 gates. Do not claim Stripe SaaS subscription readiness.

Phase 1: validate Website Intelligence, Opportunity Cloud and Dashboard Builder. These have understandable buyer jobs and testable outputs without automatically taking consequential actions. Each requires a separate customer-discovery log and pricing test.

Phase 2: validate Tender Intelligence, Sustainability OS, Global Careers, Meeting Secretary and Customer Support. Build trustworthy data sources, role-based accounts, citations and consent before accepting customer content.

Phase 3: validate remaining specialist products only after demonstrated demand. Prioritise usage and customer support evidence over the raw number of launched products.

## Financial model and spend control

All published pricing in prototype descriptions is a hypothesis, not a live offer. Before charging, estimate gross margin as collected subscription revenue minus payment fees, model inference, data suppliers, infrastructure, storage, support and refunds. Start with zero new spending, then require explicit approvals for any external service incurring cost. Measure actual paid conversion, activation, churn and support load by product.

## Acceptance criteria for every release

1. Genuine prospect evidence and named customer problem, with consent.
2. Working preview with domain-specific, tested acceptance cases.
3. Licensed sources and verified integration terms.
4. Security review including tenant boundary and abuse testing.
5. Privacy policy and effective data export/deletion.
6. Complete onboarding, payment, entitlement, cancellation and refund test with real provider approval.
7. Human override, error handling, clear customer support and observability.
8. Explicit owner approval to merge, publish, promote or accept payments.

