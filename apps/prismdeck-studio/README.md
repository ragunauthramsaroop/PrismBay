# PrismDeck Studio

Premium 16:9 slide design, multi-format source import, local editing and native PowerPoint export.

## Source-to-PowerPoint workflow

1. Open the studio, select "Upload source files or article".
2. Upload files, drop files onto the target, or paste an article.
3. Select audience, slide count, and theme before extraction.
4. Read the generated narrative, chart sources, and slide notes. Replace sample framework text when needed.
5. Edit each slide, then select "Export PPTX". Text, shapes and chart data remain editable.

### Accepted inputs

| Source | Ingestion | Notes |
| --- | --- | --- |
| Articles, HTML, plain text, Markdown | Browser | Paste text, or upload .html, .txt, .md |
| PDF | Browser | Text layer only. Scans need OCR beforehand |
| Word .docx | Browser | Extracts paragraphs and tables as text |
| Word .doc, OpenDocument .odt | Private converter | LibreOffice converts legacy Office formats |
| PowerPoint .pptx | Browser | Extracts slide wording; rebuilds a new design, not exact slide geometry |
| PowerPoint .ppt, OpenDocument .odp | Private converter | Converts to PPTX, extracts slide text |
| Excel .xls/.xlsx, CSV and TSV | Browser | Reads worksheet rows and quantitative pairs for native charts |
| OpenDocument .ods | Private converter | LibreOffice conversion |
| MP4, MOV, WebM, MKV, M4V, MP3, WAV, M4A | Private converter | CPU Whisper speech transcription; visuals are not analyzed |
| SRT, VTT captions | Browser | Uses subtitle text as source material |
| Saved PrismDeck .json | Paste into "Import Markdown outline" | Restores edit-ready slide structures |

The private converter is optional, separately deployable, and NOT included in the frontend deployment. A configured service and bearer token are necessary for legacy Office or audio/video. Never upload sensitive files to a conversion server you do not administer.

### Document provenance and claims

The source deck processor uses direct extracted text, notes the source filename, and avoids inventing statistics. Numeric charts derive from uploaded workbook rows only. Caption and automated transcript accuracy require editorial review. The presentation framework generator (prompt-only mode) is rule-based, not a connected generative AI service. It contains clearly marked placeholder metrics and demo charts.

### Local data and privacy

Modern document extraction runs in the browser. Deck drafts are autosaved locally. Exporting JSON, Markdown, or PPTX triggers a local download. No analytics, remote model API, registration or billing. When using the private converter, upload file bytes travel to the manually selected converter endpoint with a session-only bearer token, never stored in deck state.

## Local development

Node.js 22 recommended.

    cd apps/prismdeck-studio
    npm install
    npm run dev
    npm run test
    npm run build

Browser regression suite:

    npx playwright install chromium
    npm run test:e2e

Private converter details: server/README.md. CI: .github/workflows/prismdeck-studio-ci.yml from the repository root.

## Open-source basis

- PptxGenJS, MIT, for editable OOXML PowerPoint exports.
- PDF.js (pdfjs-dist) for selectable PDF text.
- Mammoth for DOCX text.
- SheetJS CE 0.20.3 direct from the official CDN, not the vulnerable outdated npm 0.18.5 release.
- JSZip for PPTX slide XML.
- python-pptx, python-docx, LibreOffice and faster-whisper for the optional private converter.

Presenton (Apache-2.0), Slidev (MIT), and Casual Slides were reviewed as architecture inspirations only. No proprietary assets or third-party project code were copied into PrismDeck.

## Scope and limitations

This is a working first-phase editor, not yet a full substitute for every paid presentation suite. Imported slide layouts, video visuals, embedded images, PDF scans, Excel formulas, and unsupported fonts are not faithfully round-tripped. Prompt-only writing is structured rather than generative. Advanced designer-grade AI generation, brand kits, team collaboration, image analysis and a public SaaS deployment require separate development and authorization.

## Safety gate

Follow AGENTS.md and the repository's main safety instructions. Changes are isolated to apps/prismdeck-studio and a dedicated CI workflow. No modifications to ecommerce checkout, supplier flows, social publishing or existing application routes.
