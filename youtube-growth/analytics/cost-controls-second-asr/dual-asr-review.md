# PrismBay AI Cost Controls | Second-model speech alignment triage

Target: UCw2hs85TzIpdKwJtG-BSxzQ / @PrismBayAI. Review only. No upload.

Independent base.en ASR word timestamps compared with the 134-cue corrected SRT.
Prior comparison used tiny.en. Both estimates are fallible and are not listening approval.

Base-model review cues: 26 of 134.
Earlier tiny-model flags not repeated by base-model proxy: 19.

| Cue | Prior flag | Matched words | Start drift | End drift | Second-model decision |
| --- | --- | ---: | ---: | ---: | --- |
| 32 | False | 100% | -0.154 | 13.783 | TIMING_REVIEW |
| 33 | True | 8% | 13.783 | 9.192 | LOW_WORD_MATCH_REVIEW |
| 36 | False | 42% | 2.442 | -0.378 | LOW_WORD_MATCH_REVIEW |
| 58 | True | 100% | -1.559 | -2.004 | TIMING_REVIEW |
| 2 | True | 62% | -0.54 | -1.755 | TIMING_REVIEW |
| 56 | True | 90% | -0.429 | -1.619 | TIMING_REVIEW |
| 16 | True | 36% | 0.415 | -1.617 | LOW_WORD_MATCH_REVIEW |
| 59 | True | 100% | -1.344 | -1.614 | TIMING_REVIEW |
| 57 | True | 92% | -1.259 | -1.559 | TIMING_REVIEW |
| 63 | True | 100% | -1.129 | -1.524 | TIMING_REVIEW |
| 97 | True | 75% | 0.515 | -1.521 | TIMING_REVIEW |
| 9 | True | 91% | -0.646 | -1.491 | TIMING_REVIEW |
| 133 | True | 100% | 1.205 | 1.487 | TIMING_REVIEW |
| 134 | True | 100% | 1.487 | 1.177 | TIMING_REVIEW |
| 18 | False | 33% | 0.624 | -1.475 | LOW_WORD_MATCH_REVIEW |
| 98 | True | 64% | -0.921 | -1.334 | TIMING_REVIEW |
| 46 | False | 80% | -0.949 | -1.319 | TIMING_REVIEW |
| 132 | True | 91% | 0.848 | 1.205 | TIMING_REVIEW |
| 99 | True | 33% | 1.166 | -0.41 | LOW_WORD_MATCH_REVIEW |
| 61 | False | 100% | -0.179 | -1.144 | TIMING_REVIEW |
| 62 | False | 100% | -1.144 | -1.129 | TIMING_REVIEW |
| 64 | False | 100% | -1.144 | -0.524 | TIMING_REVIEW |
| 10 | False | 100% | -1.111 | -0.496 | TIMING_REVIEW |
| 30 | False | 85% | -0.608 | -1.027 | TIMING_REVIEW |
| 34 | False | 0% | None | None | LOW_WORD_MATCH_REVIEW |
| 35 | False | 0% | None | None | LOW_WORD_MATCH_REVIEW |
| 19 | True | 67% | 0.945 | -0.454 | SECOND_MODEL_WITHIN_ONE_SECOND |

## Recognized speech near critical cues

### Cue 16
Caption: Six thousand times five times two cents equals six hundred dollars.
Base.en speech proxy: uses 5 paid calls, 6 ,000 times 5 times 2 cents equals $600 in month two. Each task uses

### Cue 30
Caption: There is a reason to take these controls seriously. On October twenty-second,
Base.en speech proxy: useful work or paying to repeat itself. There is a reason to take these controls seriously. On October 22, Cognizant published a survey of 250 senior

### Cue 31
Caption: Cognizant published a survey of two hundred and fifty senior FinOps leaders
Base.en speech proxy: controls seriously. On October 22, Cognizant published a survey of 250 senior FinOps leaders at large organizations in the United States,

### Cue 32
Caption: at large organizations in the United States, United Kingdom and India.
Base.en speech proxy: survey of 250 senior FinOps leaders at large organizations in the United States, United Kingdom,

### Cue 33
Caption: Seventy-two percent of the surveyed organizations had exceeded their AI budgets in
Base.en speech proxy: States, United Kingdom,

### Cue 34
Caption: the preceding twelve months. The survey was vendor-sponsored and does not establish
Base.en speech proxy: 

### Cue 35
Caption: the rate for every business.
Base.en speech proxy: and India. The cost visibility

### Cue 98
Caption: The combined one hundred dollars divided by eighty accepted outputs equals
Base.en speech proxy: and corrections cost another $60. The combined $100 divided by 80 accepted outputs equals $1 .25 per accepted result.

### Cue 99
Caption: one dollar and twenty-five cents per accepted result.
Base.en speech proxy: accepted outputs equals $1 .25 per accepted result. If you only report $0 .40 per attempted task,

### Cue 132
Caption: PrismBay AI helps founders, operators and executives implement practical AI business
Base.en speech proxy: controls before giving the agent more responsibility. Prism Bay AI helps founders, operators and executives implement practical AI business systems. Subscribe for

### Cue 133
Caption: systems. Subscribe for the next breakdown, where we will turn this
Base.en speech proxy: operators and executives implement practical AI business systems. Subscribe for the next breakdown where we will turn this scorecard into a simple workflow

### Cue 134
Caption: scorecard into a simple workflow you can inspect and adapt.
Base.en speech proxy: business systems. Subscribe for the next breakdown where we will turn this scorecard into a simple workflow you can inspect and adapt.


This report prioritizes listening. It does not approve speech, captions, mobile playback, licenses or publication.
publicationApproved=false; uploadPermitted=false; paidSpendUSD=0.
