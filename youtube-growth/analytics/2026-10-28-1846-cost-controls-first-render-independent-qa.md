# PrismBay AI: AI Agent Cost Controls first-render independent QA
Date: 2026-10-28, 18:46 Guyana time
Channel: `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`
Disposition: MODIFY. UNAPPROVED. No upload, scheduling, paid advertising, or monetization claim.

## Source verified
- GitHub Actions run: https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40775107153
- Run status: completed successfully; artifact ID `12853928680`, `prismbay-ai-cost-controls-unapproved-40775107153`.
- Downloaded and independently inspected the actual 15 MB ZIP containing MP4, 120-cue provisional SRT, manifest and three 1280x720 thumbnail variants.
- MP4 SHA256: `2101ffbaa369461184a4972a84b908ebdf49a4287e76f78f5ac1be86fa1c4729`; matches the artifact manifest.
- Media: 473.665 seconds (7:53.665), H.264 1920x1080 at 24 fps, AAC at 22,050 Hz. 38 paragraph scenes, eight chapters, six original infographic assets.
- FFmpeg volumedetect: mean -21.6 dB, peak -2.9 dB. No black intervals over 0.25 seconds detected in the independent scan.
- Manifest explicitly states `published=false`, `publicationApproved=false`, `uploadPermitted=false`, `paidSpendUSD=0`, provisional captions and pending narration/device review.

## Independent visual findings
- Inspected 14 representative frames spanning 1 to 420 seconds and all three thumbnails.
- The source contains repeated full-frame graphics and split layouts with a small repeated infographic inset. This is a retention-quality concern for an almost eight-minute video. Do not treat successful encoding as editorial readiness.
- Some split-screen chapter headings were visibly shortened with ellipses, including the Control Three heading. The original renderer explicitly used `textwrap.shorten` and sliced lines, which also risked omitting meaningful spoken words from on-screen cards.
- All three thumbnails were legible in a combined contact sheet. Variant A presents the clearest quantified promise, with the fictional-example label. Thumbnail selection still needs audience data and native YouTube A/B testing where available.
- The 120-cue SRT is a separate provisional file. The MP4 has no verified embedded subtitle track. Sentence timings were estimated by word proportion, not word-level speech alignment. This must not be represented as verified caption delivery.
- The offline synthetic voice is a low-cost fallback, but a full independent narration listen is outstanding. Audio sampling frequency is 22.05 kHz, which warrants listening for artifacts before release.

## Remediation initiated
- Updated `scripts/render-ai-agent-cost-controls.py` in commit `9fb2e6303a499be61a1bdb6bc4b3cb45b7db2350`.
- The split-screen renderer now fits complete chapter headings and selected opening sentences to measured glyph bounds rather than truncating text with character limits.
- Enlarged the original evidence inset from 680x383 to 820x461 while retaining an explicit fictional-example disclosure.
- The source change triggers the existing read-only GitHub Actions draft workflow. A new completed render, frame inspection and speech review are still required. Do not infer new quality from the code change alone.

## Release gate
1. Verify the revised workflow completed, inspect new frames and confirm full title/paragraph visibility, no overlap and no clipped financial data.
2. Listen to the entire final narration and correct robotic pronunciation, pacing, pauses and errors. Prefer natural narration when available at zero cost.
3. Align subtitles against the actual audio, check readability, and verify YouTube delivery via a supported caption route or a carefully reviewed burned-in master.
4. Check the entire video on a phone-sized display, especially disclosure and small inset graphics. Replace monotonous static sequences with original diagrams, meaningful motion or demonstrations where warranted.
5. Compare three distinct title/thumbnail packages using native A/B testing only when the final long-form upload is eligible.
6. Verify no duplicate or conflicting scheduled posts for the authorized channel and preserve the closed publication gate until approval.

Metricool confirmed brand 6945443 points to the sole channel ID. It returned seven subscribers, 83 channel views on 2026-10-24, 62 on 2026-10-25, and no additional scheduled posts for 2026-10-28 through 2026-11-12. Later video-level retention was not returned. Descript had no active project jobs. Opera Ask Studio required interactive authorization.
