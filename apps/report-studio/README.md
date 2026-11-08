# PrismBay Report Studio

An offline, evidence-first PDF reporting engine for annual reports, CSR publications, ESG reports, board reports and white papers. This starter is a functioning command-line system, not a one-click generative writing platform.

## Features

- Compiles a structured JSON manuscript into vector-text A4 PDFs with cover, narrative, KPI panels, photographic evidence and reference register.
- Enforces source IDs for every paragraph and KPI. Production-mode source records require verified status.
- Refuses unknown sources, missing photographic credit, missing image permission, path traversal and absent local images.
- Continues long narrative content onto new pages without silently truncating claims.
- Generates a document SHA-256, detects blank pages, checks A4 sizing and verifies the presence of a references section.
- Extracts text from PDF, DOCX, XLSX and TXT sources into a local, unverified evidence inventory.
- Runs without an AI API or paid infrastructure. All source data stays local until explicitly transferred.

## Install and run

Requires Python 3.11 or later.

    cd apps/report-studio
    python -m pip install -r requirements.txt
    python report_studio.py validate projects/demo.json
    python report_studio.py build projects/demo.json --output output/demo.pdf
    python report_studio.py inspect output/demo.pdf
    python -m unittest discover -s tests -v

For optional local document extraction:

    python report_studio.py extract /your/private/input --output /your/private/extracted

The extract command does not determine whether a claim is true. Review each passage before adding it to the manuscript.

## Manifest

Start from projects/demo.json. Set meta.demonstration to false for production work. Enter verified sources with unique IDs, titles, locators and reviewed_at dates. Enter pages of type narrative, metrics or photo. Every narrative paragraph, metric and photograph requires source_ids. Photo pages require image, caption, alt_text, credit and rights set to owned or licensed. Images must be local to the manifest folder.

The included sample contains fictional sources and figures. Its provenance is for demonstrating software behavior only, not evidence of any organisation's achievements.

## Upstream components and limits

The editorial workflow follows the document QA approach described in anthropics/skills (PDF, DOCX, layout reviews). NVIDIA/auto-ontology is an optional later adapter for larger relational data catalogs. pbakaus/impeccable is a future option for designing an HTML publication interface. No upstream third-party code is vendored, no model is downloaded, and neither external integration is falsely represented as installed.

This starter does not autonomously write a 75-page narrative from loose source documents, verify the accuracy of data, provide a web editor, or deploy a customer-facing service. Those are separate development phases.

## Privacy and publishing

PrismBay is a public repository. Never commit unpublished AGM Inc. documents, employee details, copyrighted photos, account secrets or confidential material. Keep project-specific sources and production manifests in owner-approved private storage. CI compiles only the fictional demonstration. This module does not publish reports, email documents, or call external APIs.

## Print-quality review

After building, open every page at 100% zoom and inspect text flow, charts, photographs, credits and links. Run the included PDF inspection command. Before final public printing, run a 300-DPI render and press/prepress review with fonts and imagery checked for the selected printer. The engine has A4 geometry but is not an ISO-compliant PDF/X export tool.

## Development milestones

1. Current: offline structured compilation, evidence gates, photographic rights, repeatable PDF checks and demonstration.
2. Next: optional verified Excel-to-metric mapping, editorial approval queue and template variants.
3. Later: private object storage, optional ontology connector, licensed design themes, browser editor and separately reviewed deployment.
