# CaribContract Atlas | user-owned, independent procurement venture

CaribContract Atlas is a separately branded procurement research venture. It is not the PrismBay SaaS catalog, educational YouTube content, or government procurement platform. Its source code currently shares an existing PUBLIC GitHub repo and a preexisting free Floot production project to avoid new subscriptions. The owner or an authorized legal entity, not an AI assistant, is the operator and merchant of record.

## What is live
- [Current official tender explorer](https://growth-access.floot.app/caribcontract-atlas)
- [One-time US$29 Bid Decision Dossier scope](https://growth-access.floot.app/caribcontract-dossier)
- [Free prospective-client tender source screening](https://growth-access.floot.app/caribcontract-pilot)
- [Practical Guyana bidder guide](https://growth-access.floot.app/guyana-tender-bid-checklist)

The merchant's connected Stripe account currently displays PrismBay, and the checkout must disclose that fact. A Stripe payment link exists, capped at 10 paid orders, and must be provided only after source suitability screening. No payment or profit is guaranteed. Zero paid orders and zero customer enquiries were verified during initial setup.

## GitHub, not Floot, executes the public document workload
The CI workers use the public repository's standard GitHub Actions Linux runners, so they do not consume the limited Floot build quota. GitHub Actions is NOT the merchant website, order database or payment processor.

1. `.github/workflows/caribcontract-source-scout.yml` (already operational): daily read-only public source extraction, reviewed JSON artifact and strict non-publication gate. Direct public API scanner in `scout_api.mjs`; no browser installation, running server or paid API required. The Playwright scanner remains only as a legacy reference.
2. `.github/workflows/caribcontract-dossier-worker.yml` (new): Python 3.12, pdfplumber MIT PDF text extraction, Jinja2 BSD-3-Clause HTML templating, fully offline tests, and a short-lived public-source evidence dossier artifact. On weekdays, selects one upcoming public government record for internal quality review. For on-demand use, choose Actions -> CaribContract Atlas Free Dossier Worker -> Run workflow and provide only an official public `PROC-YYYY-NNNNN` reference.
3. The dossier worker checks the official public API at `https://eprocure.gov.gy/api/method/doctracker.api.powerbi.get_public_bid_opportunities`, and downloads up to one linked public PDF from exactly `https://eprocure.gov.gy/files/`. It rejects other hosts, redirects off the host, missing data, oversized documents and unreadable PDF content.
4. The produced PDF evidence references are NOT a substitute for the complete bidding documents. Evidence is labeled as preliminary. The official bid-opening date is never represented as a guaranteed submission cutoff.
5. A published customer report requires actual Stripe live payment verification, matching tender and buyer information in private records, manual evidence-quality review, then documented delivery through the authorized Gmail sender. The scheduled ChatGPT automation checks for consented business enquiries and genuine paid orders, not cold outreach.

## Commercial boundaries
- The sellable item is one written public-advertisement-based source review for **US$29 once**, subject to source screening. There is NO US$29/month subscription.
- One dossier covers only one publicly accessible procurement reference. The work includes verifiable evidence-location snippets, areas needing clarification, questions for the issuer, and an internal bid/no-bid readiness plan. The customer controls all legal, commercial and bidding decisions.
- A public advertisement may contain too little data. In that case the quality gate fails, and the team must decline or review the order and refund according to the published terms.
- Lead data, order records and payment evidence remain in private Floot/Stripe/Gmail systems. No emails, customer identities, paid sessions, Stripe API keys, financial records, employer information or project secrets enter public GitHub Actions logs or artifacts.
- No inventory, ads, outreach to people who did not request contact, bidder impersonation, government endorsement or automatic bid submission.
- Do not call any work profitable without subtracting transaction costs, refunds, taxes and verified service costs.

## Source research and licensing
- [pdfplumber](https://github.com/jsvine/pdfplumber), MIT, extracts readable text and page numbers from public PDF documents.
- [Jinja2](https://github.com/pallets/jinja), BSD-3-Clause, renders safely HTML-escaped evidence reports.
- [Docling](https://github.com/docling-project/docling), MIT, researched as an optional expansion for complex scanned documents. It is NOT installed because the current CI worker prioritizes lightweight, zero-subscription processing.
- [Huginn](https://github.com/huginn/huginn), MIT, considered for multi-agent monitoring. NOT deployed because running it requires a persistent server. Existing free GitHub Actions is a simpler fit.
- GitHub Pages is NOT a suitable commercial storefront under GitHub's terms. The present storefront stays on the already-published Floot subdomain. For future independent hosting, evaluate Cloudflare Pages or Workers with direct commercial permission and a separately connected account. No paid service or new Cloudflare account has been created.

## Operating the new worker
```bash
cd ventures/caribcontract-atlas
python -m pip install -r requirements-dossier.txt
python -m unittest discover -p test_dossier_engine.py -v
python dossier_engine.py --tender-id PROC-2026-00509 --output-dir output/dossiers
```

Outputs are `output/dossiers/PROC-YYYY-NNNNN.html`, `.txt` and `.json`. These are internal draft artifacts only. Never deploy this output as if the buyer report were finalized. If official materials are unreadable, the script reports a source-quality failure.

## Business acceptance metrics
Review aggregate-only interest requests, genuinely qualified purchase invitations, paid and completed checkout sessions on the correct live account, successful report deliveries, refunds and total net revenue. No synthetic buyers, inflated view counts, or traffic claims.

## Known remaining constraints
- The existing Floot free-plan build limit is independent of GitHub. The GitHub worker avoids consuming it, but changes to the Floot frontend still require a future Floot publish action.
- This program does not connect directly to Stripe or Mercury, and does not send buyer reports from the public CI runner.
- GitHub Actions artifact creation is technical progress, not evidence of a customer purchase.
