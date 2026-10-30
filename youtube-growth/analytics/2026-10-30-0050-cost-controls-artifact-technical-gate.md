# PrismBay AI | Independent long-form artifact release-gate application

Checked 2026-10-30 00:50 America/Guyana (04:50 UTC). Sole authorized channel: `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`. Experiment `PB-AI-COST-CTRL-20261028-LF01`. Issue #526. No publication authorization.

## Evidence and method
Downloaded the existing original, unapproved GitHub Actions artifact `prismbay-ai-cost-controls-unapproved-40802160968` (artifact ID 12866038124; run https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40802160968). Independently extracted the video, 134-cue SRT, manifest and three thumbnails. Ran a separate local Python/FFmpeg/ffprobe implementation of the repository's read-only long-form technical release criteria. This was an **independent equivalent implementation**, not a claim that the exact repository script was executed. Full 9m19s H.264/AAC decoding completed with zero FFmpeg errors. Inspected 11 distributed video frames and all three title-card candidates; sampling does not constitute continuous playback or complete listening.

## Verified measurements
- SHA256 `c8da6a5fa46bb1e7ea9dfd6abf82b55d44b80d7fc63fdf515db7362d58be6a72`, exactly matching the source manifest.
- 559.503 seconds, 1920x1080, 24 fps, H.264 video, AAC audio. 13,426 video frames. Full video/audio stream decode passed.
- 134 SRT cues, 0 overlaps, minimum cue duration 1.594 seconds, no black intervals >0.2 seconds. Peak audio level -2.95 dBFS. No detected audio silences over 1 second at -35 dB threshold.
- **Technical release gate FAIL:** 7 cues exceed the 160 WPM reading-speed limit. Cue 46: 173.7 WPM; cues 55-57: 174.5 WPM each; cues 100-102: 167.4 WPM each. Maximum 174.55 WPM.
- Previous independent ASR comparison still flags 16 estimated timing exceptions: cues 2, 9, 16, 19, 33, 56-59, 63, 97-99 and 132-134. These are estimated speech-alignment differences, not listening-confirmed errors.
- The sampled 11-frame visual contact sheet shows coherent branding and no obvious clipping in those samples, but repeated dark slide layouts and text-heavy sequences pose a retention risk. Thumbnail A emphasizes a fictional $600-to-$2,400 cost anomaly; B emphasizes stopping the retry loop; C emphasizes spending, access and proof. These are distinct A/B concepts, not a test result.

## Required corrective actions
1. Align captions with actual spoken audio at all 16 ASR-exception locations, prioritizing numbers and source qualifiers at cues 2, 16, 33 and 97-99; check the full closing CTA at 132-134. Do not fix WPM merely by shifting text away from its spoken phrase.
2. Re-segment or retime the seven over-160-WPM cues against actual speech, preserve wording, keep cues >=1.5 seconds and eliminate overlaps. Re-run the technical release checker against the corrected final MP4/SRT.
3. Listen to the entire narration and inspect continuous mobile playback, visual changes, original-media rights, voice-model and dependencies. The primary-source survey qualifier must remain accurate.
4. Confirm the native Studio target, Earn status and calendar before any public action. No YouTube A/B test until Studio access and final approval.

## Operational verification
Metricool brand 6945443 is connected to exactly `UCw2hs85TzIpdKwJtG-BSxzQ`. Checked 2026-10-30 00:47 Guyana. Seven subscribers. Observed 83 views on Oct 24, 62 on Oct 25 and 7 on Oct 26; remaining daily values missing, not zero. No scheduled posts in Metricool Oct 30-Nov 15. Descript project `3de30d73-71c8-4e9d-9ccf-72faf3fb5d11` has no running jobs; existing procurement media import remains in the project, with no newly created composition. Opera's Studio browser requires interactive authorization.

**Disposition: MODIFY / HOLD.** `publicationApproved=false`, `uploadPermitted=false`, paid advertising $0. No public upload, revenue or subscriber milestone verified.
