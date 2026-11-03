# PrismBay Portfolio Lab (development only)

An original, standalone, offline product incubator for the 19 PrismBay AI/SaaS concepts. The repository currently contains a separate Cashflow Cloud pilot (see issue #544). This folder does not replace or deploy that pilot.

## Run

No paid dependencies, API keys or package installation required.

1. From repository root, run: python3 -m http.server 8765 --directory incubator/prismbay-portfolio
2. Visit: http://localhost:8765
3. Select a product, edit the fictional JSON example, and press Run local prototype.
4. Optional: export the generated local JSON report.

Run self-checks with: node incubator/prismbay-portfolio/test.mjs (Node 20+).

## What is implemented

- A polished, responsive product catalogue covering all 19 workspaces.
- An individual working deterministic prototype for every product, using supplied data and domain-specific logic.
- Search and category filtering, source template links, editable examples, metric cards, findings, reviewer actions, input validation, and JSON report export.
- Basic accessibility: native keyboard controls, labels, visible focus, live result announcements, and no unsafe HTML insertion.
- Fully local processing. No network requests in the prototype code, and no customer inputs are stored in a database or browser storage.
- Tests covering all 19 prototype runs and selected error-handling cases.

## What is NOT implemented

No production SaaS functionality exists in this folder: no AI model calls, externally validated data, document-upload processing, source crawling, multi-tenant persistence, accounts, messaging, scheduling, payment links, subscriptions, customer onboarding, hosted deployment, professional or regulated advice, actual travel reservations or live job/award feeds.

Prototypes accept manually entered or fictional information. An output does not prove an external fact or readiness for sale. Pricing is a hypothesis, not a current offer or verified demand.

## Security and operating rules

- Keep this branch separate from main. Do not merge, publish, deploy, promote or accept money without explicit owner approval and release-gate evidence.
- The existing retail storefront, educational YouTube, Mission Control and Cashflow pilot remain untouched.
- Do not paste customer financial, employment, medical or private business data into a public development environment.
- Browser data stays in memory; any exported JSON becomes a file controlled by the person running the page.
- Gate production on authenticated tenant separation, privacy and deletion controls, provider eligibility for Guyana, data-source permissions, realistic costs, abuse protection, observability and actual end-to-end buyer testing.
- For recruitment, compliance, finance and ESG outputs, require human review and independently sourced evidence.

## Provenance and licences

The concepts and learning references derive from https://github.com/Shubhamsaboo/awesome-llm-apps, an Apache-2.0-licensed repository. No upstream source code has been copied into this folder. The prototype implementation is original and dependency-free. Any future upstream source imports must retain notices and comply with applicable licences, including transitive dependencies.

The upstream repository is a collection of demonstrations, not a guarantee of commercial suitability.

## Files

- core.mjs: 19 product descriptions, fictional examples and separate prototype engines.
- index.html, styles.css, app.mjs: responsive prototype application.
- test.mjs: product and safety checks.
- BUILD_PLAN.md: 19 production backlogs and staged go-to-market priorities.
- OPERATIONS.md: proposed internal agent roles, approval boundaries and release gates.

Status: development storage only.
