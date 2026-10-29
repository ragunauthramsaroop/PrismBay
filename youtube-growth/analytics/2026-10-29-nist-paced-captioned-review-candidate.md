# PrismBay AI | NIST Short pacing and caption release candidate | 2026-10-29

Sole channel: `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`. Metricool brand `6945443`. Zero paid advertising and no payment methods.

## Material progress

The earlier 48.279-second NIST agent-identity Short used a 21-cue readability-first SRT with a maximum 159.74 words per minute but up to 1.001 seconds of ASR word-center smoothing displacement. The independent NIST QA workflow [40924466647](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40924466647) produced a second 22-cue timing-first SRT with **zero smoothing displacement relative to recognized word centers**, but seven cues above 160 WPM and one shorter than 1.5 seconds. Neither first candidate was publication-ready.

A new pitch-preserving FFmpeg review workflow [40925565238](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40925565238) succeeded. It stretches the source audio and video duration by 1.15, using FFmpeg `atempo` to preserve pitch, and scales the timing-first SRT. Output: **55.523 seconds**, 1080 x 1920, H.264/AAC, 22 subtitle cues, maximum **159.07 WPM**, **zero** cues above 160 WPM, **zero** cues below 1.5 seconds, and zero additional smoothing displacement relative to ASR anchors. Full audio/video decode passed. The video remains original PrismBay visual diagrams, not copied clips.

The same workflow now produces a second **caption-burned review MP4**, a separate uncaptioned MP4, SRT, ASS and machine-readable report. Explicit ASS PlayRes 1080 x 1920 and 47-pixel captions positioned around y=500 prevent the default libass scaling defect found in an initial local overlay test. A sampled captioned frame at 38.5 seconds showed no text collisions; this is **sampled visual evidence**, not continuous playback acceptance.

Verified final candidate SHA256 (captioned MP4): `dadebd0ecbdfb4201dbc734deb415d68c38865068d8b5ebcd888189ef7326418`. Uncaptioned MP4: `731a45223d3e71ac4aa5df7ea3619f88721f8d85e7496cfb413d0601bd31f307`. Source: `a7a3f3469d6f2ec6d620d50c5ff1e32f8075cddd271fd1b2b3c1eae541387dc4`.

The [unpublished review artifact](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40925565238) expires on 2026-11-12. Artifact name: `prismbay-nist-paced-review-40925565238`. No public YouTube watch URL exists for this candidate.

## Still required before any publication

Full narration listening, script/ASR mismatch review, continuous mobile playback including subtitles and naturalness of 15% pitch-preserved slowdown, complete voice and dependency-rights verification, native Studio schedule check, exact-channel confirmation, and duplicate checks. All approval fields remain `false`. Never represent ASR-relative zero displacement as proof of perfect human-verified sync.

## Live growth checks

Metricool brand settings reconfirmed channel ID and timezone America/Guyana. Subscriber count: 7. Reported October views total 364 over 16 non-null reporting dates; missing dates are not zero. Metricool schedule October 29 to November 7 returned no posts. Direct Ask Studio and native Earn/country checks were blocked by noninteractive Opera authorization. Descript project had no active jobs; no credits purchased.

YouTube's official [2027 YPP changes](https://support.google.com/youtube/blog/451804019/updates-to-the-youtube-partner-program-new-earning-opportunities-changes-to-eligibility) were rechecked on October 29. Guyana is absent from the official [expanded YPP territory list](https://support.google.com/youtube/answer/13429240), while the channel's registered country and actual Earn eligibility are still unverified. No account-country changes are authorized.

Publication status: `HOLD`. Paid spend: USD 0. No upload, sponsor, external revenue, breakout or subscriber milestone verified.
