# PrismBay AI Cost Controls: corrected-render independent QA

Date: 2026-10-28, 19:46 Guyana time
Sole channel: `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`
Decision: MODIFY. NOT APPROVED FOR PUBLICATION.

## Source and media integrity

- Corrected production: https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40783111966
- GitHub Actions completed successfully, with artifact `prismbay-ai-cost-controls-unapproved-40783111966` (ID 12857789192). Artifact ZIP SHA256 digest reported by GitHub: `cb5ed577751786e39fa855bd130990ad09f008aecf4149ff5dcfdd7daa5750a1`.
- Independently downloaded the actual corrected ZIP and extracted its MP4, provisional SRT, manifest and three thumbnail images.
- Corrected MP4: 474.064 seconds (7:54.064), 1920x1080, 24 fps, H.264/AAC. Verified SHA256 `3ec9fb4fa49e64c589830fc1992d401b5dbeb74ebeba143c5116fcc2e76c308d`, matching the embedded manifest.
- Audio: mean -21.7 dB, peak -2.9 dB. No black intervals over 0.25 seconds detected.
- All three thumbnail candidates are 1280x720. Manifest confirms `published=false`, `publicationApproved=false`, `uploadPermitted=false`, `paidSpendUSD=0`.

## Visual and editorial inspection

- Inspected 15 representative frames at 4, 35, 65, 110, 145, 180, 210, 240, 275, 310, 345, 380, 415, 448 and 468 seconds.
- Prior truncated chapter headings are corrected in these samples. Control Three wraps across two lines instead of losing words. No major clipping or infographic overlap observed in the sampled frames.
- Video still alternates between full-screen static infographics and repeated split layouts. Small infographic insets remain a retention and mobile readability risk. Sampling is not full-playback approval.
- Provisional captions remain a separate SRT without verified delivery to YouTube. Independent inspection counted 120 cues, with 30 above 180 words/minute, 9 shorter than 1.5 seconds, and 11 longer than 7 seconds. Time allocation remains proportional to text length, not independently aligned to speech.
- Full narration listening, real-device playback, final caption synchronization, and native YouTube A/B eligibility remain unverified.

## Remediation

- A zero-cost renderer revision slows draft narration with pitch-preserving FFmpeg `atempo=0.84`, moving duration toward the preferred 8-12 minute range and reducing the rate of provisional subtitle text.
- Added word-preserving, length-bounded provisional caption chunks with punctuation-aware boundaries, rather than dense multi-sentence cues. This is a readability experiment, not forced speech alignment.
- The revised output requires rendering, measurement and listening before any publication decision. Reject the revision if the slower voice sounds unnatural. Do not claim synchronization or accessibility without direct checks.

## Publication controls

The only permitted destination is `UCw2hs85TzIpdKwJtG-BSxzQ`. No new channel, Metricool post, paid spend or account-country change. Continue to withhold uploads pending complete narration listening, accurate subtitles, mobile viewing, source disclosure and duplicate schedule checks.
