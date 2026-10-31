# PrismBay AI: S07-V4 editorial context fix and release control

**Audit date:** 2026-10-31, Guyana. **Target:** `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`. **Metricool brand:** `6945443`. **Paid spend:** $0.

## Completed production
- Examined 11 representative S07-V3 vertical frames and the full 18-cue subtitle file. Found a concrete editorial mismatch: the audio says "Gate two" while the upper graphic said "01 / PERMISSION CONTROL", leaving the standalone lesson's sequence ambiguous.
- Produced **S07-V4**, a 44.864-second 1080x1920 private Short. Replaced only the upper series label with **"GATE 2 OF 5 / LEAST PRIVILEGE"**. The four-level ladder, captions, narration and subscriber CTA are otherwise preserved.
- Reproducible local PIL + FFmpeg render, 24 fps, 1,076 video frames. Full video decode passed.
- **Audio identity verified:** extracted AAC stream MD5 is `f33ca4b4c21cf638c7ee349de6ae5413` for both V3 and V4; decoded frame-MD5 manifests also match. No new narration was invented or recorded.
- V4 MP4 SHA-256: `d1b597c478fea9c12b026fbd7742caf28fd63ac8db800149acd682930d0bca2a`. Local review ZIP and 11-frame mobile-width contact sheet prepared. This is not a physical-device playback test.

## Connected channel and growth signals
- Metricool brand settings map to the exact channel ID. **7 subscribers**, last observed October 31. October evolution returns **365 observed views across 17 populated dates**, with **14 dates missing view values**; do not count missing dates as zero.
- For October 24–31, available views are 83 (Oct 24), 62 (Oct 25), 7 (Oct 26), 1 (Oct 28). Other dates are unknown.
- No scheduled posts between Oct 31 and Nov 16. Metricool all-videos and traffic-source queries returned no rows. Thus no valid per-video retention baseline or traffic-source inference.
- Metricool's provisional highest weekly Wednesday time is **16:00 Guyana**, score **12,033** for Nov 1–7 week. This is a platform score, not a predicted view count; **nothing was scheduled**.
- Descript Shorts Factory project `3de30d73-71c8-4e9d-9ccf-72faf3fb5d11` has no active jobs. Opera Browser Connector reports browser not connected, preventing Ask Studio, Studio Earn, native A/B tests and authenticated uploads. GSC Wizard refuses access due to subscription requirement; no payment or upgrade attempted.

## Policy verification and eligibility risk
- YouTube's August 10, 2026 announcement states that from **2027-02-01**, new applicants for ad/Premium revenue sharing need **8,000 qualified watch hours** or **20 million qualified Shorts views**. Separate Shorts ad/subscription revenue sharing requires **10 million qualified Shorts views in 90 days**. Existing YPP members are not subject to the new entry thresholds: https://blog.youtube/news-and-events/youtube-partner-program-updates-2027-new-opportunities-earn/
- The official YPP country list includes **French Guiana** but **does not list Guyana**. Channel-country/Earn status must be checked in the actual Studio account; never misrepresent residence to bypass eligibility: https://support.google.com/youtube/answer/7101720
- Qualified long-form hours exclude Shorts, private/unlisted videos and ad views. Qualified Shorts views are public engaged views: https://blog.youtube/news-and-events/youtube-monetization-qualified-watch-hours-shorts-views/

## Release decision
**S07-V4: MODIFY COMPLETED, HOLD FOR FINAL RELEASE QA.** Complete full narration listening, spoken-caption check, actual mobile-device playback, editorial sign-off, channel/Earn verification and an authorized media-transfer route before scheduling. No public upload or new public watch URL was confirmed. Do not generate additional near-duplicate versions without a specific new defect.

**Publisher handoff:** title "Never Give an AI Agent Your Finance Login"; category Education; madeForKids=false; source is original narration/diagrams and a fictional accounts-payable example. Video upload requires a real accessible MP4, not a ZIP or an invented URL. Publish only to the exact channel. Follow 6h, 24h, 72h and 7d analytics windows after verified publication.
