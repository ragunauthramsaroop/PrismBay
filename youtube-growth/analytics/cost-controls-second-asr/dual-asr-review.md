# PrismBay AI Cost Controls | Second-model speech alignment triage

Target: UCw2hs85TzIpdKwJtG-BSxzQ / @PrismBayAI. Review only. No upload.

Independent base.en ASR word timestamps compared with the 134-cue corrected SRT.
Prior comparison used tiny.en. Both estimates are fallible and are not listening approval.

Base-model review cues: 24 of 134.
Earlier tiny-model flags not repeated by base-model proxy: 19.

| Cue | Prior flag | Matched words | Start drift | End drift | Second-model decision |
| --- | --- | ---: | ---: | ---: | --- |
| 32 | False | 100% | -0.194 | 7.563 | TIMING_REVIEW |
| 34 | False | 38% | 2.592 | -0.583 | LOW_WORD_MATCH_REVIEW |
| 58 | True | 100% | -0.879 | -1.964 | TIMING_REVIEW |
| 2 | True | 62% | -0.54 | -1.735 | TIMING_REVIEW |
| 16 | True | 36% | 0.415 | -1.637 | LOW_WORD_MATCH_REVIEW |
| 59 | True | 100% | -1.604 | -1.594 | TIMING_REVIEW |
| 56 | True | 90% | -0.409 | -1.599 | TIMING_REVIEW |
| 57 | True | 100% | -1.199 | -1.559 | TIMING_REVIEW |
| 9 | True | 91% | -0.646 | -1.511 | TIMING_REVIEW |
| 63 | True | 89% | -1.109 | -1.504 | TIMING_REVIEW |
| 97 | True | 75% | 0.195 | -1.501 | TIMING_REVIEW |
| 18 | False | 33% | 0.624 | -1.455 | LOW_WORD_MATCH_REVIEW |
| 134 | True | 100% | 1.447 | 1.177 | TIMING_REVIEW |
| 98 | True | 64% | -0.081 | -1.374 | TIMING_REVIEW |
| 46 | False | 100% | -0.249 | -1.319 | TIMING_REVIEW |
| 133 | True | 91% | 1.205 | 1.267 | TIMING_REVIEW |
| 132 | True | 91% | 0.868 | 1.205 | TIMING_REVIEW |
| 61 | False | 100% | -0.199 | -1.164 | TIMING_REVIEW |
| 64 | False | 100% | -1.144 | -0.504 | TIMING_REVIEW |
| 62 | False | 100% | -0.404 | -1.109 | TIMING_REVIEW |
| 35 | False | 100% | -0.583 | -1.058 | TIMING_REVIEW |
| 30 | False | 85% | 0.212 | -1.027 | TIMING_REVIEW |
| 99 | True | 33% | 1.026 | -0.41 | LOW_WORD_MATCH_REVIEW |
| 33 | True | 0% | None | None | LOW_WORD_MATCH_REVIEW |
| 19 | True | 67% | 0.905 | -0.434 | SECOND_MODEL_WITHIN_ONE_SECOND |

This report prioritizes listening. It does not approve speech, captions, mobile playback, licenses or publication.
publicationApproved=false; uploadPermitted=false; paidSpendUSD=0.
