# PrismBay AI | Unit Economics Short independent source QA | 2026-10-28 11:46 Guyana

Sole authorized channel: `UCw2hs85TzIpdKwJtG-BSxzQ`, handle `@PrismBayAI`. Metricool brand 6945443. This is an UNAPPROVED QA record. No public upload, scheduling, new channel, paid advertising or account-country changes authorized.

## Source and reproducibility

- Latest audited source: GitHub Actions render [40710079706](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40710079706), artifact ID `12825947547`, 11 files including MP4, SRT, manifest, caption QA and seven original scene PNGs. Artifact expiry: 2026-11-04.
- Independently downloaded and unpacked the source artifact. Source MP4 SHA256: `2778b2a2af4c8be5e6999c4fb2cc012821418de7bf0cc6a4c4459057bde7e026`, matching both source manifest and the current independent speech report.
- Source duration 67.834 seconds. Reproduced an independent 1080x1920, 30 fps H.264/AAC burned-caption review export from the source MP4 and all 33 SRT cues, using the current workflow's ASS font size 57, right margin 210 and bottom margin 540. Locally reproduced QA MP4 SHA256 `024f8ca1f8bff68d68ca99788f5db9342979c852b0501a533b996b1267111e91`. This is a temporary local QA copy, not an approved publishing master.
- Independently inspected the seven source scene PNGs and 15 burned-caption preview frames at 1.5, 10, 15.5, 21, 25, 29.5, 34, 36, 40, 45, 48, 54, 58, 63 and 66.5 seconds. In these sampled frames, subtitles sit below the key $390, $430, $0.56 and $0.48 figures and above the lower simulated Shorts UI exclusion area. The vendor-claim and fictional-example labels remain visible. This is sampled frame inspection, not real-device Shorts UI approval.
- Independent FFmpeg checks: H.264/AAC, 1080x1920, 30fps, no detected black interval of at least 0.1 second at pixel threshold 0.05. Audio mean -17.1 dB, peak -1.4 dB. Audio loudness checks do not replace full narration listening.
- Source financial arithmetic: $390/700=$0.5571 (~$0.56); $430/900=$0.4778 (~$0.48). Fictional scenario, not verified customer results. Cadence's initial vendor-reported claim is up to 5X *token efficiency*, not 5X complete business-cost savings.

## Matching speech report, more review flags than prior source

Current independent ASR report `editorial/youtube/qa/PB-AI-UNIT-ECON-20261027/speech_alignment_report.json` matches the source SHA and 33 cues. Word-sequence similarity 0.837, median boundary error 0.284s, p90 0.640s. Automated pass is only a coarse proxy.

Review the following eight cues before release: 10 (1/6 matched words; start -1.318s), 12 (end +1.170s), 14 (1/6 matched; end +0.820s), 16 (3/7 matched), 17 (2/4 matched), 19 (1/6 matched; start -2.100s), 27 (start -1.294s), and 28 (start -1.002s). Also review dense cues 21-24 and the source's maximum 19.67 characters/second. Do not infer speech errors solely from the tiny.en ASR proxy.

## Workflow correction

Fixed the caption-preview workflow's two manual/push fallback source run IDs, from superseded render 40646043307 to current audited render 40710079706, in [commit cb30037](https://github.com/ragunauthramsaroop/PrismBay/commit/cb300373cdab091e40d0a385f06aedd90c1c221c). The workflow-file push should trigger a new preview using the current source and matching speech report. Successful completion of that new run is not yet verified. The prior workflow's `workflow_run` event already follows successful production runs.

## Connected publication and performance observations

- Metricool brand 6945443 matches the sole authorized YouTube channel. One prior Short, `i7v6wfwd5-I`, is confirmed PUBLISHED, and the schedule query found no additional pending YouTube post through 2026-11-07.
- Latest available evolution data: 7 subscribers on October 28; 83 channel views October 24 and 62 October 25. October 26-28 views are NULL, not zero. Revenue observed $0 on available rows. All-video analytics returned no rows; per-video retention, watch minutes, traffic sources and subscriber attribution remain unavailable. Growth classification: INSUFFICIENT_DATA.
- Descript Shorts Factory project `3de30d73-71c8-4e9d-9ccf-72faf3fb5d11` has no active jobs. Opera Studio access requested interactive authorization and was unavailable for this unattended run.
- YouTube's official [YPP eligibility](https://support.google.com/youtube/answer/94522) and [February 2027 changes](https://support.google.com/youtube/answer/12843009) remain separate from the unverified country prerequisite tracked in issue #509. No eligibility claim or channel setting change.

## Release decision

`publicationApproved=false`; `uploadPermitted=false`. Complete full narration listening, manually correct verified caption text/timing issues, inspect mobile Shorts overlays on the final export, verify the final source/caption hash and duplicate-free calendar, then explicitly approve release. Continue separate long-form research and production work while the Short is held. Advertising spend USD 0.
