# PrismBay AI | NIST Short: second-by-second frame and script-coverage audit | 2026-10-29 16:41 Guyana

Authorized channel: `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`. Metricool brand `6945443`. No paid advertising. No upload authorization.

## Evidence acquired and independently examined

Downloaded the original GitHub Actions artifact `prismbay-nist-paced-review-40925565238`, artifact ID `12919109246`, from [successful workflow 40925565238](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40925565238). Archive was 4.3 MB and contained both captioned and uncaptioned MP4s, ASS, SRT and a machine report. The captioned video is 55.523 seconds, 1080x1920, H.264/AAC, SHA256 `dadebd0ecbdfb4201dbc734deb415d68c38865068d8b5ebcd888189ef7326418`. The uncaptioned version is SHA256 `731a45223d3e71ac4aa5df7ea3619f88721f8d85e7496cfb413d0601bd31f307`. Both hashes independently matched the artifact's report.

Extracted **55 one-second video frames**, seconds 0 through 54, into four 4x4 contact sheets and inspected all 55 thumbnails, including all six authored scenes, opening hook and closing CTA. No obvious cropped headline, obstructed central diagram, missing scene or black frame was observed at these one-second samples. This is a broader sample than the earlier 20-frame check, but is **not continuous playback** and does not establish every intervening frame's visual quality. The core 1080x1920 content is high contrast and legible at the sampled scale. Secondary source/footer text remains small on a phone; assess against YouTube's mobile interface overlays before release. The video relies on six static layouts, so retention and motion variety remain editorial risks.

## Subtitle and source-script integrity

Compared the 22 SRT cues against the six `segments[].spoken` fields of the committed original request `content/youtube/requests/nist-agent-identity-revocation-2026-10-29.json`. Unicode punctuation and hyphen separators were normalized consistently on both sides, preserving word order. **119 of 119 normalized source-script tokens appear in the exact original order, with zero substitutions, insertions or deletions.** This verifies caption *text coverage* only; it does not verify that the generated narration pronounced every word correctly or that cues align perfectly with the sound.

Independent subtitle timing checks: 22 cues, 115 whitespace-separated words, maximum 159.07 words per minute, minimum cue duration 1.610 seconds, zero overlapping cues. A few boundaries break sentences across cues (e.g. cue 3 ends in 'On'); this is a minor reading-flow concern. Keep the ASR-anchored timestamps unless a synchronized revision is tested.

Independent FFmpeg EBU R128 analysis of the captioned MP4: integrated loudness **-21.8 LUFS**, loudness range **2.8 LU**, true peak **-3.0 dBFS**. This is a measurement, not an assessment of pronunciation, narration naturalness or audio intelligibility.

## Connected operations

Metricool brand settings still identify exactly `UCw2hs85TzIpdKwJtG-BSxzQ` and `America/Guyana`. Scheduled posts query covering 2026-10-29 through 2026-11-18 returned **zero**. YouTube evolution still reports **7 subscribers**. October daily views are incomplete; 364 views across 16 observed dates must not be described as the complete October total. Descript Shorts Factory reports no running jobs; imported procurement media exists but no Descript share publication is recorded. Opera Studio access requires interactive authorization, so native Ask Studio and Earn tab were not inspected.

## Release decision

**TECHNICAL FRAME AND CAPTION TEXT COVERAGE: PASS. FULL EDITORIAL APPROVAL: PENDING.** Keep `published=false`, `publicationApproved=false`, `uploadPermitted=false`, and `paidSpendUSD=0`. Remaining gates: full uninterrupted listening of the actual narration, spoken-word subtitle timing, continuous mobile playback including YouTube UI safe zones, complete voice and asset rights, exact native Studio schedule/duplicate check, and channel-country/Earn verification. A visual contact sheet and a perfect script-to-SRT match do not replace those checks. No public YouTube URL, subscriber milestone, breakout performance or revenue event was verified.
