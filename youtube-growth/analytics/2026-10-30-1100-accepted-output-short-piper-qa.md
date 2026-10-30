# PrismBay AI | Original accepted-output Short | independent Piper render QA | 2026-10-30 11:00 Guyana

Authorized channel only: `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`. Metricool brand 6945443.

## Original content and production

Produced a distinct, original, worked-example Short: **"Your AI Agent's $1.00 Task Really Costs $1.25 | AI ROI."** Six custom 1080x1920 infographic scenes and 12 phrase-specific Piper voice segments. The exact words of each narration phrase appear in the burned-in caption for the same segment. A separate 12-cue SRT is supplied for review. The numerical example is expressly fictional and is disclosed on every frame. No stock video, external music, real customer data, or paid media was used.

Example: 100 attempted tasks, 80 accepted, $40 in model/tool charges, $60 in human review, $100 total. $100 / 80 accepted = **$1.25 per accepted result**. The $1.00/attempt comparison is arithmetic, not an ROI or savings claim. Retries, rework, approvals, and implementation costs must be included in a real pilot.

## Reproducible source and CI

- [Renderer](https://github.com/ragunauthramsaroop/PrismBay/blob/main/youtube-growth/production/render_accepted_output_short.py).
- [Review-only workflow](https://github.com/ragunauthramsaroop/PrismBay/blob/main/.github/workflows/prismbay-accepted-output-short-review.yml).
- [Experiment registration](https://github.com/ragunauthramsaroop/PrismBay/blob/main/youtube-growth/experiments/PB-ACCEPTED-UNIT-20261030-S05.json).
- Initial Piper render: [run 41075708267](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/41075708267), passed basic media QA but caption #9 was approximately 200 WPM.
- Corrected narration tempo, with caption #9 slowed separately, and added a strict 160 WPM CI gate. Final [run 41076235401](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/41076235401) **completed successfully**.
- Final unpublished artifact ID **12988395130**, expires 2026-11-06 14:58 UTC. Do not publish the artifact URL as a watch link.

## Independent final artifact QA

Downloaded the final artifact and independently verified the MP4 fingerprint against its own manifest. SHA256: `4e1d83146ab1e454a0f3a7080e5c709fa74ad1e54abc98aa48b336961ecb9295`.

- Duration: **43.799 seconds**.
- Video: 1080x1920 H.264, 24 fps, 1,050 decoded frames.
- Audio: AAC mono 22,050 Hz, measured integrated loudness **-20.48 LUFS**, true peak **-1.83 dBTP**.
- Full independent FFmpeg decode: PASS, zero reported errors.
- Captions: 12 phrase-synchronous cues, **maximum 151.94 words per minute** (cue 9), no mechanically overlapping cues.
- Sampled six representative frames, one per distinct scene. Original math and fictional-data disclosures are legible in a desktop 324x576 contact sheet. Caption panel is positioned above the lower Shorts UI zone and avoids the far-right button area by design. Actual device playback remains unverified.
- A local 48.747-second ESPEAK build was used solely to test rendering and was **not** approved or distributed as publishable audio.

Voice provenance: the `en_US-norman-medium` [upstream model card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/norman/medium/MODEL_CARD) identifies a public-domain LibriVox training dataset; the repository declares MIT for model assets. Confirm final notice and dependency obligations before public release. This Short uses animated information graphics and a synthetic narrator, not a realistic impersonation or photorealistic event. Follow YouTube's [2026 disclosure guidance](https://blog.youtube/news-and-events/improving-ai-labels-viewers-creators/) when uploading.

## Connected channel and portfolio controls

Metricool on 2026-10-30 verified exactly seven subscribers. Observed views were 83 on Oct 24, 62 on Oct 25, and seven on Oct 26; other dates were null, not zero. No scheduled posts were found from Oct 30 through Nov 17. Descript Shorts Factory has no active jobs. Opera browser access requires interactive authorization. Metricool's best-time scores favor 16:00 Guyana on some weekdays, but are not proof of this seven-subscriber channel's audience behavior. Do not schedule until release approval.

## Release decision

**TECHNICAL QA PASS / EDITORIAL HOLD.** Full listening, voice pronunciation check, actual YouTube interface playback, rights notice verification, and final editorial sign-off remain outstanding. No publication, subscriber milestone, external revenue or paid advertising is claimed.

`publicationApproved=false`; `uploadPermitted=false`; `paidSpendUSD=0`.
