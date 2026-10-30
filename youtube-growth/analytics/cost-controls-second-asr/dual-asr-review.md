# PrismBay AI Cost Controls | Second-model speech alignment triage

Target: UCw2hs85TzIpdKwJtG-BSxzQ / @PrismBayAI. Review only. No upload.

Independent base.en ASR word timestamps compared with the 134-cue corrected SRT.
Prior comparison used tiny.en. Both estimates are fallible and are not listening approval.

Base-model review cues: 26 of 134.
Earlier tiny-model flags not repeated by base-model proxy: 19, 33.

| Cue | Prior flag | Matched words | Start drift | End drift | Second-model decision |
| --- | --- | ---: | ---: | ---: | --- |
| 58 | True | 100% | -1.579 | -2.004 | TIMING_REVIEW |
| 2 | True | 62% | -0.54 | -1.755 | TIMING_REVIEW |
| 56 | True | 90% | -0.429 | -1.619 | TIMING_REVIEW |
| 16 | True | 36% | 0.415 | -1.617 | LOW_WORD_MATCH_REVIEW |
| 59 | True | 100% | -1.364 | -1.614 | TIMING_REVIEW |
| 57 | True | 92% | -1.279 | -1.579 | TIMING_REVIEW |
| 63 | True | 89% | -1.109 | -1.524 | TIMING_REVIEW |
| 64 | False | 100% | -1.524 | -0.504 | TIMING_REVIEW |
| 97 | True | 75% | 0.255 | -1.521 | TIMING_REVIEW |
| 9 | True | 91% | -0.646 | -1.491 | TIMING_REVIEW |
| 134 | True | 100% | 1.447 | 1.157 | TIMING_REVIEW |
| 18 | False | 33% | 0.624 | -1.435 | LOW_WORD_MATCH_REVIEW |
| 98 | True | 46% | 0.979 | -1.374 | LOW_WORD_MATCH_REVIEW |
| 46 | False | 80% | -0.909 | -1.299 | TIMING_REVIEW |
| 133 | True | 91% | 1.205 | 1.267 | TIMING_REVIEW |
| 132 | True | 91% | 0.848 | 1.205 | TIMING_REVIEW |
| 61 | False | 100% | -0.059 | -1.164 | TIMING_REVIEW |
| 90 | False | 83% | 1.14 | -0.519 | TIMING_REVIEW |
| 10 | False | 100% | -1.111 | -0.476 | TIMING_REVIEW |
| 62 | False | 100% | -0.424 | -1.109 | TIMING_REVIEW |
| 99 | True | 33% | 1.066 | -0.37 | LOW_WORD_MATCH_REVIEW |
| 35 | False | 100% | -0.583 | -1.058 | TIMING_REVIEW |
| 36 | False | 92% | -1.058 | -0.378 | TIMING_REVIEW |
| 30 | False | 85% | -0.608 | -1.027 | TIMING_REVIEW |
| 70 | False | 100% | -0.337 | -1.01 | TIMING_REVIEW |
| 71 | False | 100% | -1.01 | 0.029 | TIMING_REVIEW |
| 19 | True | 67% | 0.925 | -0.434 | SECOND_MODEL_WITHIN_ONE_SECOND |
| 33 | True | 77% | 0.603 | 0.192 | SECOND_MODEL_WITHIN_ONE_SECOND |

## Independent small.en survey audio probe
Window: 120 to 160 seconds of the verified unpublished video.
Recognized text: useful work or paying to repeat itself. There is a reason to take these controls seriously. On October 22, Cognizant published a survey of 250 senior FinOps leaders at large organizations in the United States, United Kingdom, and India. 72% of the surveyed organizations had exceeded their AI budgets. In the preceding 12 months, the survey was then dissponsored and does not establish the rate for every business. The useful takeaway is narrower leaders need cost visibility tied to work performed, not a dashboard showing token totals without a business outcome.
RMS signal samples: 130s=0.083786, 132s=0.091728, 134s=0.06049, 136s=0.074495, 138s=0.084266, 140s=0.086325, 142s=0.071244, 144s=0.103279, 146s=0.08039, 148s=0.057662, 150s=0.110663, 152s=0.094319
ASR and RMS are not human listening approval.

## Recognized speech near critical cues

### Cue 16
Caption: Six thousand times five times two cents equals six hundred dollars.
Base.en speech proxy: uses 5 paid calls, 6 ,000 times 5 times 2 cents equals $600. In month two, each task uses

### Cue 30
Caption: There is a reason to take these controls seriously. On October twenty-second,
Base.en speech proxy: useful work or paying to repeat itself. There is a reason to take these controls seriously. On October 22, cognizant published a survey of 250 senior

### Cue 31
Caption: Cognizant published a survey of two hundred and fifty senior FinOps leaders
Base.en speech proxy: controls seriously. On October 22, cognizant published a survey of 250 senior FinOps leaders at large organizations in the United States,

### Cue 32
Caption: at large organizations in the United States, United Kingdom and India.
Base.en speech proxy: survey of 250 senior FinOps leaders at large organizations in the United States, United Kingdom, and India. 72 % of the surveyed organizations had

### Cue 33
Caption: Seventy-two percent of the surveyed organizations had exceeded their AI budgets in
Base.en speech proxy: States, United Kingdom, and India. 72 % of the surveyed organizations had exceeded their AI budgets. In the preceding 12 months, the survey was then just sponsored and

### Cue 34
Caption: the preceding twelve months. The survey was vendor-sponsored and does not establish
Base.en speech proxy: organizations had exceeded their AI budgets. In the preceding 12 months, the survey was then just sponsored and does not establish the rate for every business. The useful takeaway is narrow

### Cue 35
Caption: the rate for every business.
Base.en speech proxy: survey was then just sponsored and does not establish the rate for every business. The useful takeaway is narrow leaders need cost visibility

### Cue 98
Caption: The combined one hundred dollars divided by eighty accepted outputs equals
Base.en speech proxy: and corrections cost another $60. They combine $100 divided by 80 accepted outputs equals $1 .25 per accepted result.

### Cue 99
Caption: one dollar and twenty-five cents per accepted result.
Base.en speech proxy: accepted outputs equals $1 .25 per accepted result. If you only report $0 .40 per attempted task,

### Cue 132
Caption: PrismBay AI helps founders, operators and executives implement practical AI business
Base.en speech proxy: controls before giving the agent more responsibility, prism bay AI helps founders, operators and executives implement practical AI business systems. Subscribe for

### Cue 133
Caption: systems. Subscribe for the next breakdown, where we will turn this
Base.en speech proxy: operators and executives implement practical AI business systems. Subscribe for the next breakdown, where we will turn the scorecard into a simple workflow

### Cue 134
Caption: scorecard into a simple workflow you can inspect and adapt.
Base.en speech proxy: business systems. Subscribe for the next breakdown, where we will turn the scorecard into a simple workflow you can inspect and adapt.


This report prioritizes listening. It does not approve speech, captions, mobile playback, licenses or publication.
publicationApproved=false; uploadPermitted=false; paidSpendUSD=0.
