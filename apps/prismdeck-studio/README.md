# PrismDeck Studio

Standalone premium presentation workspace in the PrismBay monorepo. Runs entirely in the browser. No paid API or user account is required for the first release.

## What works

- Prompt-to-structured-outline generation with clear placeholders rather than fabricated claims.
- Eight slide layouts: cover, section, bullets, split, stats, editable chart, quote, and close.
- Four premium themes with consistent typography and spacing.
- Live 16:9 preview; slide add, duplicate, reorder, delete, and text editing.
- Edit chart labels/values, three KPI cards, speaker notes, and slide metadata.
- Import a Markdown outline or saved JSON deck. Download Markdown and JSON.
- Export a native, editable PowerPoint (.pptx) with real text boxes, shapes and charts.
- Local autosave in the current browser, plus reset and keyboard shortcut for export.
- Offline deck generation. Browser fonts load from Google Fonts when connected; CSS fallbacks are included.

## Run

Node.js 22 or later recommended.

1. From apps/prismdeck-studio, run npm install.
2. Run npm run dev.
3. Open the local Vite address and generate or edit a deck.
4. Run npm run check before release.

Production static build: npm run build. Deploy only the resulting dist folder to a static host, after review. This change does not alter PrismBay's main application or existing deployment routes.

## Source and license

The PowerPoint generation engine uses [PptxGenJS](https://github.com/gitbrent/PptxGenJS), MIT licensed. Open-source reference projects evaluated: [Presenton](https://github.com/presenton/presenton) (Apache-2.0), [Slidev](https://github.com/slidevjs/slidev) (MIT), and [Casual Slides](https://github.com/CasualOffice/slides). These projects were researched, not vendored or represented as code merged into this application. Their trademarks and design assets are not included.

## Reality checks

This first release is a practical, rule-based presentation designer, not a cloud AI agent. Generated titles and story frameworks need editorial review. Demo charts are labeled illustrative. No document-to-PPTX, animated video, PPTX import/round trip, teamwork, authenticated AI, or image generation is claimed. Real data and source citations belong with the author.

## Next architecture milestones

1. Secure authenticated AI plan/critique endpoint with rate limits, token budget and source-grounding gates.
2. Rich document ingestion with citations and verified source-to-slide mapping.
3. Multi-slide brand kits, corporate fonts, charts, image libraries and licensing policy.
4. PPTX import/editing and OOXML fidelity regression suite.
5. Multi-tenant accounts, billing, team workspaces and audit log, following commercial approval.

## Security

All first-release deck content stays in browser storage until exported. No analytics beacon, tracker, hidden upload, API keys or automatic publishing. Do not place confidential corporate source material in a public repository. Never enable open, unauthenticated billable model requests.
