# Editorial Report Studio

Reusable document-production quality controls for premium landscape reports.

## Why it exists

Editorial reports should combine strong visual design with traceable evidence, documented photography permissions, and PDF preflight checks. The generic toolkit lives in PrismBay. Client-specific reports, photographs, source documents, and nonpublic business figures do not belong in this public repository.

## Production process

1. Ingest approved documents and log source title, version and reporting date.
2. Extract tables, paragraphs and figures, then build a claim-by-claim evidence register.
3. Build a consistent typography, color and page-grid system. Use documentary images only when rights and captions are recorded.
4. Render pages as PDF, run PDF preflight, visually inspect every page, and fix clipping and low-resolution images.
5. Obtain subject consent where required, management authorization, legal review and factual sign-off before external publication.

## Tools

- Docling: source ingestion where installed.
- LightRAG: retrieval only when configured with a traceable source set, never as a substitute for evidence.
- Slides Maker, UI UX Pro Max and Impeccable: editorial design references and review patterns, not dependencies.
- Typst, Paged.js or another deterministic PDF compositor: page output.
- `preflight.py`: verifies PDF size, page-boundary text, effective raster resolutions, evidence register integrity, and publication-gate status.

## Usage

```bash
python -m pip install PyMuPDF
python tools/editorial-report-studio/preflight.py report.pdf \
  --evidence evidence_register.csv \
  --photos photo_provenance.csv \
  --out preflight.json
```

`--release` refuses a report with missing rights or unapproved evidence. Absence of validation issues is not a certification, assurance report, accessibility audit or legal authorization.

## Evidence register columns

`id, reported_value, metric_definition, reporting_period, source_document, source_page, evidence_class, publication_control`

## Photo register columns

`asset, source_document, source_page, captions_approved, rights_cleared, notes`

Status values `YES`, `APPROVED`, `TRUE` and `CLEARED` count as approved. Everything else requires review.

## Security

- Never commit client data, unpublished annual reports, staff images or internal source documents to this repository.
- Track development issues without confidential source details.
- Keep management-review artefacts separate from approved public releases.
