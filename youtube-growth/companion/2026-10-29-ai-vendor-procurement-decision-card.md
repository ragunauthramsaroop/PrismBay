# PrismBay AI | AI Vendor Procurement Decision Card
Prepared: 29 October 2026 | Sole YouTube channel: `UCw2hs85TzIpdKwJtG-BSxzQ` (`@PrismBayAI`)
Status: Original educational companion for the **unpublished** AI vendor procurement Short (`PB-PROC-GATE-20261029-S03`). No vendor assessed. No legal or compliance certification. Paid distribution: USD 0.

## The executive question
Before a business buys an AI agent or model service, ask: **Can the supplier prove who accesses our data, what the system is permitted to do, how we stop it, and whether the economics survive real-world exceptions?**

A polished demo does not answer those questions. Use the following evidence-led decision card to compare offers against one defined business use case. Do not enter real confidential records into an unapproved trial.

## Four non-negotiable gates
A failed gate means **do not connect the vendor to production**, regardless of the weighted score. Require a documented exception and accountable risk owner before any reconsideration.

1. **Data rights and handling.** Obtain contractual clarity on retention, deletion, subprocessors, geographic processing, and whether inputs or outputs train or improve the provider's models. Verify the controls in a sandbox. A vague FAQ is not evidence.
2. **Authority and containment.** Require least-privilege credentials, scoped actions, an independent stop/revoke mechanism, and human approval for consequential actions. Test whether a revoked token or permission actually prevents the next action.
3. **Security and incident response.** Obtain incident notification commitments, a named escalation path, audit evidence, and a response plan proportionate to the intended data and impact. Validate supplier claims rather than assuming a certificate covers the proposed integration.
4. **Contract and exit.** Confirm commercial terms, intellectual-property treatment, data export/deletion, portability, termination assistance, and responsibility for third-party components. Require written terms for material commitments.

## Weighted evidence scorecard (PrismBay original example)
Score each row 0 to 4: 0 = no evidence, 1 = claim only, 2 = partial documented evidence, 3 = documented plus a credible test, 4 = independently reproducible evidence on the proposed use case. Compute **points = weight × score ÷ 4**. The weights and thresholds are PrismBay decision aids, not NIST requirements.

| Criterion | Weight | Evidence to request | Score (0–4) | Points |
| --- | ---: | --- | ---: | ---: |
| Data governance and privacy | 20 | DPA, retention/deletion test, subprocessors, training-use terms | | |
| Identity, access and security | 15 | Access matrix, least-privilege test, revoke/deny logs | | |
| Task quality and failure behavior | 15 | Representative blind evaluation, error taxonomy, red-team cases | | |
| Human oversight and stop control | 15 | Approval gates, rollback drill, operator escalation | | |
| Traceability and audit evidence | 10 | Timestamped request/decision logs, tamper resistance | | |
| Contract, portability and exit | 10 | Exit clause, export test, third-party dependency inventory | | |
| Full cost per accepted outcome | 10 | All-in cost, exception labor, rework, usage limits | | |
| Incident handling and resilience | 5 | Incident SLA, outage drill, fallback plan | | |
| **Total** | **100** | **All four hard gates also required** | | **/100** |

Suggested internal triage: 80–100 = eligible for controlled pilot if all gates pass; 60–79 = remediate before pilot; below 60 = reject or rescope. These are illustrative procurement policy choices. High-risk deployments require a separate, stricter assessment.

## Worked example: why a high demo score is insufficient
A fictional supplier receives scores of 3, 3, 2, 3, 2, 2, 3, 2 in the eight rows. Weighted result:

- Data: 20 × 3/4 = 15.00
- Security: 15 × 3/4 = 11.25
- Quality: 15 × 2/4 = 7.50
- Oversight: 15 × 3/4 = 11.25
- Audit: 10 × 2/4 = 5.00
- Exit: 10 × 2/4 = 5.00
- Economics: 10 × 3/4 = 7.50
- Resilience: 5 × 2/4 = 2.50
- **Total: 65/100.**

Even if this supplier had scored 95, a failed data-use hard gate would prevent production connection. No real vendor, audit or performance measurement is implied by this example.

## Thirty-day pilot with measurable ROI
Define the business task, acceptable error rate, sample selection and human reviewer before testing. Compare a control workflow with the AI-assisted workflow using the same acceptance criteria.

- **Accepted-task rate** = accepted outputs / attempted tasks. Track rework and severity of errors separately.
- **True cost per accepted task** = (subscription + usage + integration amortization + reviewer labor + rework + incident/exception costs) / accepted tasks.
- **Net monthly value** = verified labor cost avoided + verified incremental contribution margin − full monthly AI operating cost. Do not count gross revenue as profit.
- **Control effectiveness** = number of successful prohibited actions in sandbox testing, documented with test IDs and enforcement logs. A critical unauthorized action is a stop signal even when average task accuracy is high.

Illustrative math: 1,000 attempted tasks, 850 accepted outputs, $900 service and infrastructure cost, $400 review labor, $200 rework and exception handling. Total cost $1,500, or **$1.76 per accepted task** (rounded). If the existing workflow costs $2.20 per accepted task for the same quality standard, the apparent saving is **$0.44 per accepted task**, before one-time integration cost and risk adjustments. The example is hypothetical.

## Evidence packet and decision record
Record the vendor and version, business owner, use case, data classification, test environment, four hard-gate decisions, scorecard evidence links, exceptions, legal/security review, pilot outcome, residual risks, approving executive and reassessment date. Require a new review when the provider changes its model, subprocessors, access scope, data-use terms or core service behavior.

## Shorts packaging experiment, pending editorial approval
- **Audience:** procurement leads, founders, operators and finance executives purchasing AI services.
- **Hypothesis:** a clear four-gate procurement decision beats generic “top AI tools” packaging for qualified viewers and saves.
- **Variant A, risk hook:** “Before You Buy an AI Agent, Check These 4 Risks.” Cover: `4 BUYER GATES`.
- **Variant B, cost hook:** “The AI Vendor Demo Hides Your Real Cost.” Cover: `COST PER ACCEPTED TASK`.
- **Variant C, control hook:** “Ask Your AI Vendor This Before Giving Access.” Cover: `WHO CAN STOP IT?`.
- **CTA after payoff:** “PrismBay AI helps operators build practical AI business systems. Use the free vendor decision card.”
- **Experiment:** sequential Shorts packaging only, never concurrent native Shorts A/B. Choose one title for the approved release, then test a materially different hook on a distinct later video, not a duplicate upload.
- **Evaluation:** capture views, average view duration, shares, comments and subscriber conversion at approximately 6h/24h/72h/7d when available. Mark insufficient data until observations exist. No fabricated baseline or success claim.
- **Release state:** `publicationApproved=false`, `uploadPermitted=false`. Existing video still needs full narration, caption synchronization, mobile playback, voice/dependency rights and exact-channel schedule checks. Do not attach this resource to an unpublished YouTube URL.

## Evidence and attribution
The procurement criteria are an original PrismBay operational interpretation, informed by the following voluntary NIST resources, not an official NIST scorecard or certification:
- NIST AI RMF 1.0 overview: https://www.nist.gov/itl/ai-risk-management-framework
- NIST AI RMF Playbook MAP 4, including third-party component risks and supplier documentation: https://airc.nist.gov/airmf-resources/playbook/map/
- NIST AI RMF Playbook MANAGE 3, including third-party monitoring and contingency processes: https://airc.nist.gov/airmf-resources/playbook/manage/
- NIST Generative AI Profile (NIST AI 600-1), including third-party procurement and due diligence: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence

No endorsement by NIST or vendor approval is claimed.
