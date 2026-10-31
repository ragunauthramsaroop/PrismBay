# PrismBay AI | L02 | Who Approved the AI Agent?
Production package, 31 October 2026. Sole destination: UCw2hs85TzIpdKwJtG-BSxzQ (@PrismBayAI). Brand 6945443. Zero paid spend.

STATUS: RESEARCHED_SCRIPT_READY. NOT RECORDED, NOT RENDERED, NOT APPROVED, NOT UPLOADED.

## Editorial distinction
L01 and S07 teach permission boundaries for financial workflows. L02 teaches the separate problem of **decision attribution**: an audit record can name an authorized account without proving a human made the approval decision. Original PrismBay framework: **A-D-E: Actor, Decision, Evidence**. Do not suggest all AI approvals are invalid or generalize one startup's sample to all businesses.

## Audience and promise
Audience: founders, operations leaders, engineering leaders, procurement officers, audit and compliance executives.
Promise: after watching, viewers will know five evidence questions to ask before relying on an AI-assisted approval record.

## Title candidates and thumbnail pairs
1. **71 AI Approvals Looked Human. Here's the Audit Problem.** Thumbnail: large APPROVED stamp; smaller text WHO DECIDED?; one split human/agent identity silhouette. Strong concrete case-study angle. No implication this is a cross-industry statistic.
2. **Your AI Approval Log Might Be Misleading** Thumbnail: green HUMAN ACCOUNT / red DECISION UNKNOWN; two contrasting boxes. Executive risk angle.
3. **The 5 Checks Every AI Approval Workflow Needs** Thumbnail: five checkboxes; one empty beside DECISION OWNER. Searchable implementation angle.

Primary title for testing: #1. A/B long-form packaging with 3 meaningfully distinct variants only if native Studio eligibility exists. No fabricated performance claims.

## Original narration script
Target delivery: ~8 to 10 minutes with deliberate pauses and evidence visuals. No generic logo intro. Words are an original PrismBay interpretation of the cited public case and NIST guidance, not a reading of either source.

[00:00 | The uncomfortable question]
An approval log says the technical lead approved a change. The account is real. The timestamp is real. The automated check passed. But who made the decision? The person, or an AI agent operating through the person's account? Those are different facts. If your business is putting AI agents into finance, procurement, customer operations or software delivery, this distinction matters more than another dashboard showing green checkmarks.

[00:42 | One measured case, carefully scoped]
A public October 2026 case study from a fintech startup examined 786 merged pull requests over twelve weeks. During a later enforced review period, 263 non-bot merges into the main branch had the required non-author approval and passing check. In 71 of those 263, the only qualifying approval had been submitted by a coding-agent session through the technical lead's account. That is about 27 percent in this specific sample. It is not an industry failure rate, and the paper does not prove the code was defective. The problem is narrower and more important: the platform's account record alone did not establish who made the approval decision.

[01:36 | Why the difference matters]
A business often treats a green approval as evidence of independent judgment. For a software change, that might mean a reviewer inspected the risks. For an invoice, it might mean a finance manager approved payment. For a vendor onboarding, it might mean someone checked the beneficiary details. An AI system can assist those steps. But if the agent uses a person's account to submit the approval, the event log can misstate the nature of the decision. You might still have a sound process. You do not yet have sound proof.

[02:24 | The first failure: account versus actor]
Here is the first question: who executed the action? Not whose name appears on the screen. Which authenticated identity sent the request, through which session, using which tool, and under what permissions? Human accounts shared with automation collapse these distinctions. Use dedicated agent identities wherever supported, short-lived scoped credentials, and an explicit owner. The owner is accountable for the workflow, not a fictional human operator behind every automated action.

[03:12 | The second failure: actor versus decision-maker]
Now ask who decided the action was acceptable. An agent might summarize the evidence, another agent might review the output, and a person might accept the recommendation. Those are three different roles. A decision record should distinguish prepared by, checked by, and authorized by. If a person genuinely approves, capture a meaningful approval event tied to the evidence they saw. A button clicked by automation through a human session is not proof of human judgment. If the decision was delegated to software, label it as automated and document the delegation limits.

[04:03 | The third failure: approval versus exact item]
Approval of an earlier version is not approval of the final version. In code, bind the decision to the exact commit or revision. In procurement, bind it to the supplier, bank account, invoice amount, currency and supporting documents at the moment of approval. In finance, a changed beneficiary or total should invalidate the earlier authorization and require renewed review. Store a durable identifier or cryptographic digest of the approved payload. Otherwise, an approval can remain green while the underlying object changes.

[04:58 | The fourth failure: a green check with an unprotected path]
The case study also described gaps outside protected branches and moments when enforcement was disabled. That does not mean all automated gates failed. It means the perimeter of the control mattered. Your business equivalent is a payment rule applied to the normal workflow but not to emergency transfers, manual imports, alternate accounts or direct API calls. Map every route to the consequential action. Then test whether the same policy blocks an unauthorized attempt through each route. A policy written in a document is not an enforced control.

[05:48 | The fifth failure: no evidence of exceptions]
Every real workflow has exceptions. A reviewer is absent. A system is down. A supplier needs an urgent correction. The issue is not that exceptions exist. The issue is whether they have a named owner, a reason, a time limit, a separate authorization and an immutable record. Test an expired approval, a changed bank account and a missing reviewer. Your log should show a denial and an escalation, not a silent success.

[06:35 | PrismBay's A-D-E framework]
Use three columns when assessing any AI-assisted approval. Column A is ACTOR: which person or software identity performed each action? Column D is DECISION: who or what had authority to decide, within which limit? Column E is EVIDENCE: what exact item, policy, tests and approval existed before execution? This is a teaching framework, not a certification or a claim of regulatory compliance. It helps an executive spot gaps before buying another agent platform.

[07:15 | A practical demonstration]
Take a fictional purchase order for 8,400 dollars. The agent reads the order, matches an invoice, and drafts a recommendation. A human approver receives the supplier name, account details, amount, variance and policy result. The person authorizes the exact version. Only then does a separate service execute the payment, and only if the policy engine verifies the authorization. Change the bank account by one digit after approval. The payment must stop. Now try the same action through a bulk-upload route. It must still stop. That is a measurable control, not a reassuring promise.

[08:04 | Scorecard and close]
Before you expand an AI agent pilot, ask for five artifacts: the agent identity record, the decision-authority record, the approved object version, the enforcement test results, and the exception log. Measure how often a workflow produces all five, how many attempts are denied correctly, how many exceptions need human review, and the cost per accepted outcome. Faster automation is valuable only when the business knows what was approved, who decided, and what the system did. PrismBay AI helps founders, operators and executives implement practical AI business systems. Subscribe for the next operational teardown.

## Visual direction, scene-specific
- 00:00: animated APPROVED event, split into account identity versus decision identity. No fabricated platform screenshot.
- 00:42: single bar chart 71 / 263 with label "One fintech case study, Oct 2026", footnote citation. Do not show 27% as an industry average.
- 01:36: invoice / code change / supplier onboarding as three original icons.
- 02:24: three linked nodes: agent session, dedicated identity, scoped tool.
- 03:12: prepared by / checked by / authorized by as separate columns.
- 04:03: version 1 approval, version 2 changed beneficiary, red reapproval gate.
- 04:58: primary route versus alternate API and bulk import, all behind one enforcement boundary.
- 05:48: exception register with reason, approver, expiry and immutable event ID.
- 06:35: A-D-E framework three-column diagram.
- 07:15: fictional $8,400 purchase order, one-digit beneficiary mutation test, explicit DENY.
- 08:04: five evidence artifacts and subscriber promise.
Original programmatic vector diagrams, legible on 360-pixel phone simulation, no third-party footage without license.

## Two derivative Shorts, distinct hooks and payoffs
**L02-S1 | The Approval Log Lied by Omission | 42–55s**
Hook: "An AI agent submitted 71 approvals through a human account in one startup study."
Body: "The logs named the person. The study's agent transcripts showed who sent the approval. That does not mean the changes were wrong. It means account identity was not enough to prove who decided. Separate the actor, decision-maker and exact approved version."
Payoff: "Audit evidence should answer WHO DECIDED, not only WHO LOGGED IN."
CTA: "PrismBay AI: practical business systems." Visual: three-step actor/decision/version stack.

**L02-S2 | Change One Digit After Approval | 35–48s**
Hook: "Would your AI workflow stop a payment if the bank account changed after approval?"
Body: "A fictional invoice is approved. Then one digit of the beneficiary account changes. If the approval still works, your system approved a person, not a transaction. Bind authorization to the exact beneficiary, amount and document version. Deny any changed payload until it is reviewed again."
Payoff: "Run the one-digit test before giving agents payment access."
CTA: "Follow PrismBay AI for tested workflows." Visual: invoice checksum and a red policy-denial state. No real bank details.

## Metadata and distribution
Description: A real October 2026 fintech case study highlights an AI approval evidence problem: a human account does not prove a human decision. PrismBay AI explains an original Actor–Decision–Evidence framework and five practical tests for AI-assisted approvals in software, procurement and finance. Sources and methodology below. Fictional payment example; no claim of certification.
Keywords: AI agent governance, approval audit, agent identity, human in the loop, AI compliance, finance automation, procurement controls, AI business systems.
Category: EDUCATION. Made for kids: false. Synthetic/altered content: disclose when realistic altered or synthetic media triggers YouTube's current rules.
Organic companion: an original source-linked PrismBayAI.com article only after writable site verification; no copied article and no spam backlinks.
CTA: Subscribe for practical AI business systems. No paid ads.

## Experiment
ID: PB-L02-APPROVAL-EVIDENCE-20261031.
Hypothesis: A specific documented approval-evidence failure attracts more qualified founder/operator viewers than a generic agent-governance explainer.
Format: 8–10 minute original long-form, 2 derivative Shorts.
Publish time: NOT SET. Provisional Wed 16:00 Guyana from Metricool, subject to fresh timing and release gate.
Success threshold: 1.5x reliable 24-hour channel median views, or at least one subscriber per 100 organic views, evaluated only when adequate per-video data exists. Track CTR, watch time, first-30-second retention, AVD, subscriber gains, comments and shares. Review at 6h, 24h, 72h and 7d. Outcomes SCALE / RETEST / MODIFY / STOP. Do not infer failure from missing data.
Rights: original script and diagrams; sourced study discussed with attribution, not reproduced.
Release gates: complete source verification, narration listening, captions, mobile playback, packaging, correct channel, confirmed upload route, Studio monetization and policy status. publicationApproved=false; uploadPermitted=false.

## Primary sources, verified 31 October 2026
1. Adam Manji, "Who Approved This? Coding Agents, Human Accounts, and Merge-Gate Evidence at a Fintech Startup", posted 19 October 2026, https://arxiv.org/abs/2610.28683 . A single-company observational case, not a representative survey.
2. NIST NCCoE, "New Concept Paper on Identity and Authority of Software Agents", 5 February 2026, https://www.nist.gov/news-events/news/2026/02/new-concept-paper-identity-and-authority-software-agents .
3. NIST, "AI Agent Standards Initiative", created 17 February, updated 14 August 2026, https://www.nist.gov/artificial-intelligence/ai-agent-standards-initiative .
4. OWASP agentic AI isolation guidance, https://dsomm.owasp.org/mapping .
