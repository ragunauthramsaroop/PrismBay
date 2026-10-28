# PrismBay AI | Current caption preview release-gate audit | 2026-10-28 12:48 Guyana

Authorized channel: `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`. Metricool brand `6945443`. This is a technical/editorial QA checkpoint only. **Do not upload or schedule this preview.**

## New independently verified result

- GitHub Actions caption-preview run [40719579527](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40719579527) completed **successfully**. All caption generation, media checks, targeted review clip generation and artifact upload steps passed.
- Downloaded artifact `12828434535`, `prismbay-unit-economics-caption-preview-UNAPPROVED`, 8,468,292 ZIP bytes. ZIP SHA256: `09885104961d9375be2afcbc86c69098aaeef207aad1e6d70e9844881771e1cc`, exactly matching the GitHub artifact digest. Expires 2026-11-04 15:50 UTC.
- The manifest identifies source render [40710079706](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40710079706), source MP4 SHA256 `2778b2a2af4c8be5e6999c4fb2cc012821418de7bf0cc6a4c4459057bde7e026`, **33** provisional SRT cues and `MATCHING_INDEPENDENT_ASR`.
- Inspected the extracted actual preview MP4, 3,289,592 bytes, SHA256 `fb810d4ad9bfa463e7d2d7c40231fcdfdfa465e5f87374ed7931b3ca4d7cb6b2`. FFprobe: H.264 video, AAC audio, 1080 × 1920, 30 fps, 67.834 seconds.
- Independent FFmpeg volume scan: mean -17.1 dB, peak -1.4 dB. Detected short intervals of low audio level at 5.86–6.39, 10.62–10.99, 17.03–17.45, 21.37–22.18, 29.48–29.96 and 54.39–54.88 seconds (threshold -38 dB, minimum 0.35 s). These are review markers, **not evidence of narration errors**.
- Parsed all 33 SRT cues. No timestamp overlaps, no inter-cue gap over 250 ms, final cue ends 67.634 seconds. Highest provisional reading rate: **19.68 characters/second** at cue 23. Captions are not yet speech-verified.

## Visual and targeted editorial checks

Independently viewed a contact sheet of all seven actual review frames at 1.5, 15.5, 25, 34, 36, 50 and 58 seconds. The captions in these samples sit below the main ROI cards, and the illustrated `$390`, `$430`, `$0.56`, `$0.48` figures and fictional-example disclosure remain visible. This is a sampled static-frame assessment, **not** real Shorts UI/mobile playback approval.

The artifact contains **12** cue-level MP4 clips with audio, including the eight independent-ASR flags **10, 12, 14, 16, 17, 19, 27, 28**, and four dense cues **21–24**. These clips and the full narration still require actual listening. In particular, cue 19 starts 2.10 seconds before the fallible ASR onset, cue 10 matches only 1 of 6 expected words, and cues 21–24 approach 19.7 characters/second. Do not silently retime or rewrite captions solely from ASR.

## Release decision and next actions

- `publicationApproved=false`; `uploadPermitted=false`; `paidSpendUSD=0`.
- Listen to the full 67.834-second preview, verify the eight flagged cues against spoken words, correct any confirmed mismatch, and inspect cues 21–24 at phone size.
- Verify the real Shorts overlay safe area on the final version, then rerender and check the new final hash, captions and audio. Only explicitly approve after all checks pass.
- Metricool confirmed the exact channel and existing published Short `i7v6wfwd5-I`. No other pending YouTube publication appeared in the 2026-10-27 to 2026-11-05 schedule query.
- Analytics observed **7 subscribers** on 2026-10-28, **83 channel views** on 2026-10-24 and **62** on 2026-10-25. More recent daily views and video-level watch-time/retention are NULL/unavailable, not zero. Performance decision: `INSUFFICIENT_DATA`.
- Opera Studio requires interactive browser authorization. GSC Wizard refused access because its trial/subscription is inactive. Do not spend money to bypass either limitation. Descript project `3de30d73-71c8-4e9d-9ccf-72faf3fb5d11` has no active jobs.

No publication, channel setting change, ad purchase or duplicate production job occurred during this audit.
