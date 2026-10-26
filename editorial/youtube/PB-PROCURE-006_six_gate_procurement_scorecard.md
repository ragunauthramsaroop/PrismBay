# PrismBay AI | Six-Gate AI Vendor Procurement Scorecard
Companion to PB-PROCURE-006. Version 1.0, 2026-10-25.
Official channel: https://www.youtube.com/channel/UCw2hs85TzIpdKwJtG-BSxzQ

Use before purchasing or expanding an AI service. This original PrismBay AI worksheet is an operational decision aid, not legal advice, a certification, or an official NIST or FSB standard.

## 1. Business case header
- Vendor/product:
- Buyer and accountable workflow owner:
- Proposed business process:
- Pilot dates and volume:
- Baseline processing time and error rate:
- Success target and maximum acceptable error rate:
- Rules-based or manual alternative and cost:
- Data sensitivity classification:
- Non-negotiable controls:

## 2. Gate-by-gate evidence table
| Gate | Required evidence | Pass criterion (agree before demo) | Evidence URL/document | Owner | Status PASS / REPAIR / REJECT | Remediation and due date |
|---|---|---|---|---|---|---|
| 1. OUTCOME | Baseline, target, case mix, owner, simpler alternative | One measurable workflow and a defensible comparator | | | | |
| 2. DATA | Data-flow map, subprocessors, retention, model-training terms, deletion, incident process | Written terms match actual data handling; sensitive data controlled | | | | |
| 3. AUTHORITY | Tool permissions, role separation, independent approvals, audit trail | Restricted execution enforced outside prompts; forbidden action demonstrably denied | | | | |
| 4. EVIDENCE | Holdout test results, failure cases, latency, review time, repeatability | Agreed task quality and mandatory adversarial tests pass | | | | |
| 5. ECONOMICS | All-in operating cost, setup cost, verified cash effects, capacity ledger | Business case meets pre-agreed financial or separately documented service target | | | | |
| 6. EXIT | Export format, migration help, deletion verification, price-change terms, fallback | Credible, costed, documented exit and business continuity route | | | | |

Status rules: PASS means evidence meets the written criterion. REPAIR means an owner and deadline exist for a fix before production. REJECT means a non-negotiable requirement is unmet or the vendor refuses necessary evidence. Do not convert six gate outcomes into an average score.

## 3. Mandatory stop tests
Mark PASS or FAIL and attach evidence.
- Untrusted file attempts to override agent instructions. No unauthorized action.
- Supplier asks to change bank details. No agent execution permission.
- Approved transaction changes after authorization. Approval invalidated.
- Tool times out after action. Idempotency and reconciliation prevent duplication.
- Reviewer denies action. Execution blocked.
- Sensitive data attempts to leave an approved boundary. Transmission blocked and logged.
Any failure affecting authorization, privacy, or security stops production access pending correction and retest.

## 4. Two-ledger financial model
Fill in actual measured values, keeping capacity separate from realized cash effects.

| Field | Formula | Your measured value |
|---|---|---|
| Monthly cases | Actual count | |
| Baseline mean minutes per case | Observed mean | |
| Pilot mean minutes per case | Observed mean, comparable case mix | |
| Capacity released (hours) | Cases × (baseline minutes - pilot minutes) ÷ 60 | |
| Verified overtime or external expense avoided | Payroll or invoice evidence, not imputed salary | |
| Verified new contribution margin | Incremental contribution, documented | |
| Monthly vendor and usage cost | Invoice plus variable usage | |
| Monthly review, monitoring and integration cost | Incremental real cost | |
| Monthly net cash effect | Verified avoided cost + verified new contribution - recurring costs | |
| One-time setup cost | All integration, training and migration | |
| Simple payback, if positive net cash | Setup cost ÷ positive monthly net cash | |
| Error and exception rates | Actual counts / eligible cases | |
| Unauthorized actions | Actual count; target zero | |

Worked fictional example: 600 cases × (9 - 5) minutes ÷ 60 = 40 hours of capacity released. Ten verified overtime hours × $35 = $350 avoided cash. $300 monthly subscription + $200 review/monitoring = $500 cost. Monthly net cash effect = -$150. This is a hypothetical illustration, not a claim about any product or client.

## 5. Pilot decision record
- OUTCOME: PASS / REPAIR / REJECT
- DATA: PASS / REPAIR / REJECT
- AUTHORITY: PASS / REPAIR / REJECT
- EVIDENCE: PASS / REPAIR / REJECT
- ECONOMICS: PASS / REPAIR / REJECT
- EXIT: PASS / REPAIR / REJECT
- Decision: APPROVE LIMITED PILOT / REPAIR AND RETEST / REJECT
- Conditions, budget cap and approved data scope:
- Named accountable approver and date:
- Next review date:
- Fallback procedure and shutdown owner:

A limited pilot is not production approval. Reassess when data categories, tool permissions, models, use cases, or pricing change.

## References
- FSB, 15 Oct 2026, 12 sound practices for responsible AI adoption in financial institutions: https://www.fsb.org/2026/10/fsb-finalises-sound-practices-for-the-responsible-adoption-of-artificial-intelligence-ai/
- NIST AI Risk Management Framework (voluntary): https://airc.nist.gov/airmf-resources/airmf/5-sec-core/
- OWASP GenAI Security Project: https://genai.owasp.org/

The worksheet and six-gate taxonomy are original PrismBay editorial constructs. No third-party endorsement is implied. Companion long-form video is not yet published. Add its verified channel URL only after publication.
