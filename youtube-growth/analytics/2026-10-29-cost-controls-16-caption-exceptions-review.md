# PrismBay AI | Caption exception review queue

Review date: 2026-10-29 (Guyana). Sole authorized channel: `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`.

Source: independently generated Faster-Whisper tiny.en alignment CSV and machine-retimed 134-cue SRT. Video SHA256: `c8da6a5fa46bb1e7ea9dfd6abf82b55d44b80d7fc63fdf515db7362d58be6a72`. No video or captions were uploaded.

## Recomputed exceptions

Exactly **16 of 134** machine-retimed cues have at least one estimated boundary deviation greater than one second. This independently reproduces the saved retiming report's exception count. Signed drift is estimated relative to the speech recognizer. The original CSV boundary drifts were adjusted by the candidate SRT boundary movements. These are approximate ASR estimates, not listening-verified synchronization errors.

| Cue | Candidate time | Start drift (s) | End drift (s) | ASR word match | Spoken caption text |
| --- | --- | ---: | ---: | ---: | --- |
| 2 | 00:04-00:09 | 0.38 | 1.49 | 62% | last month. But the bill climbed from six hundred dollars to twenty-four |
| 9 | 00:34-00:38 | 0.51 | 1.27 | 91% | in place before an agent touches your business: a spending limit, |
| 16 | 01:06-01:12 | -0.52 | 1.04 | 36% | Six thousand times five times two cents equals six hundred dollars. |
| 19 | 01:22-01:25 | -1.09 | 0.11 | 50% | The task count did not change. |
| 33 | 02:18-02:23 | -1.04 | -0.29 | 77% | Seventy-two percent of the surveyed organizations had exceeded their AI budgets in |
| 56 | 03:50-03:54 | 0.37 | 1.38 | 90% | An email saying you spent too much is an alert. |
| 57 | 03:54-03:58 | 1.00 | 1.18 | 92% | A budget enforcement point that blocks the next charge is a control. |
| 58 | 03:58-04:02 | 0.68 | 1.54 | 100% | You also need a failure rule. When a tool times out, |
| 59 | 04:02-04:06 | 1.04 | 1.29 | 100% | the agent should not retry forever. Set a retry count, |
| 63 | 04:19-04:22 | 0.85 | 1.24 | 89% | paid tool calls are enough to test this design. |
| 97 | 06:41-06:46 | -0.42 | 1.12 | 75% | Human review and corrections cost another sixty dollars. |
| 98 | 06:46-06:51 | -1.38 | 0.77 | 46% | The combined one hundred dollars divided by eighty accepted outputs equals |
| 99 | 06:51-06:55 | -1.37 | 0.03 | 33% | one dollar and twenty-five cents per accepted result. |
| 132 | 09:06-09:11 | -1.13 | -1.50 | 91% | PrismBay AI helps founders, operators and executives implement practical AI business |
| 133 | 09:11-09:15 | -1.50 | -1.43 | 91% | systems. Subscribe for the next breakdown, where we will turn this |
| 134 | 09:15-09:19 | -1.69 | -1.34 | 100% | scorecard into a simple workflow you can inspect and adapt. |

## Listening priority

1. **Numerical correctness:** cues 2, 16, 33, 97, 98 and 99. Check dollar amounts, survey percentage and accepted-result cost against spoken audio. The word-match ratios of cues 16, 98 and 99 are below 50%, which often reflects number recognition differences and does not prove incorrect narration.
2. **Subscriber promise and final CTA:** cues 132-134. These consecutive closing cues show estimated early boundaries and deserve contiguous playback review.
3. **Controls explanation:** cues 56-59 and 63. Check the distinction between alerts, enforced blocks and retries.
4. **Other transitions:** cues 9 and 19. Review surrounding cues for continuity and legibility.

## Acceptance protocol

Listen to the entire final MP4 while reading the SRT. At each flagged timestamp, inspect at least three seconds before and after. Record the actual spoken phrase, revised cue boundaries, whether the numbers match the evidence, and the reviewer decision. Re-run cue duration, overlap and WPM checks after edits. Inspect the caption safe area at mobile size, the first 30 seconds and every chapter transition. Inspect the full audio for TTS artifacts and the full video for repetitive slide pacing. Only mark approval after complete audiovisual and mobile QA, not from ASR alone.

**Status:** HOLD / MODIFY. `publicationApproved=false`. `uploadPermitted=false`. Paid spend $0. No new channel. No automatic public upload or scheduling.
