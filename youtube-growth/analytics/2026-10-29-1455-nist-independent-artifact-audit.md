# PrismBay AI | Independent captioned NIST release candidate audit | 29 October 2026

Sole authorized destination: `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`. Metricool brand 6945443. Paid advertising USD 0. No upload, schedule or channel change.

## New independently executed checks

Downloaded the actual unpublished GitHub Actions artifact from [run 40925565238](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40925565238), rather than relying only on the prior report. Unpacked the 55.523-second caption-burned and uncaptioned videos, SRT and manifest. The captioned MP4 SHA256 is `dadebd0ecbdfb4201dbc734deb415d68c38865068d8b5ebcd888189ef7326418`, matching the signed production manifest. Exact destination channel ID matched.

A new read-only, reusable [release gate](https://github.com/ragunauthramsaroop/PrismBay/blob/main/scripts/youtube_release_gate.py) was added to the repository. A locally tested equivalent ran against the artifact. Technical result: **PASS** for H.264 video, AAC mono audio, 1080 x 1920 resolution, 55.523-second duration, complete audio/video decode, SHA256 identity, 22 consecutive subtitle cues, no overlapping cues, maximum 159.07 words/minute, minimum 1.610-second cue, final subtitle ending at 55.521 seconds, no detected black frames of 0.2 seconds or longer, and peak audio -3.009 dBFS without clipping.

Silence detection at -35 dBFS identified four short intervals of at least 0.4 seconds: 9.483-10.062 (0.579s), 25.830-26.248 (0.418s), 32.133-32.621 (0.488s), and 33.821-34.225 (0.404s). None exceeds one second. Their editorial naturalness has not been confirmed by listening.

Inspected a 20-frame visual contact sheet spanning 0.5-55 seconds and three 1080 x 1920 captioned frames at 8.8, 28.5 and 39 seconds. The large headings, three distinct tests, original diagrams, and CTA are legible in those inspected frames. Captions appear in the band between the heading and the primary diagram without obvious collision in the three full-resolution samples. This is sampled-frame evidence, not continuous mobile playback approval.

The original [NIST source](https://www.nist.gov/blogs/cybersecurity-insights/design-tenets-agent-identity-management-systems), dated 27 October 2026, supports tenets 01 (distinct identification), 04 (dynamic revocable authorization), and 10 (immutable independent evidence). The video identifies its three operator tests as PrismBay interpretation, not an official checklist.

## Monetization eligibility verification

On 29 October 2026, the official [standard YPP territory list](https://support.google.com/youtube/answer/7101720?hl=en) and [expanded YPP territory list](https://support.google.com/youtube/answer/13429240?hl=en) were rechecked. Both list **French Guiana** but not **Guyana**. This is a material eligibility risk if the channel's genuine registered country is Guyana. The channel's actual country, Studio > Earn status, and associated account jurisdiction are **unverified** because interactive Opera authorization is unavailable. Do not change or misrepresent country. The existing [country-eligibility tracking issue #509](https://github.com/ragunauthramsaroop/PrismBay/issues/509) remains the source of truth. YouTube's [August 2026 YPP announcement](https://support.google.com/youtube/blog/451804019/updates-to-the-youtube-partner-program-new-earning-opportunities-changes-to-eligibility) confirms the separate 1 February 2027 thresholds for new applicants.

## Release decision

**HOLD.** This independent check improves the technical evidence but does not verify full narration listening, word-level synchronization against the spoken audio, 15% slowed voice naturalness, continuous mobile playback, or complete production and voice rights. These remain explicit blockers. No public YouTube URL exists for the candidate. Do not infer eligibility, revenue, or upload success from Metricool's seven subscribers.

Metricool checked 29 October: seven subscribers, no scheduled posts 29 October-12 November, October 24/25/26 reported 83/62/7 views respectively, and missing 27/28 October view figures remain null. Descript has no active jobs. Direct Studio access remains blocked by interactive browser authorization. No paid capacity used.

The gate is read-only. Its machine PASS does not set `publicationApproved` or `uploadPermitted` to true. Continue the nine specialist-agent workflow without generating near-duplicate unpublished videos.
