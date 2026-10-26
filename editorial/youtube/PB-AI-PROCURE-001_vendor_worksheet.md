# PrismBay AI | PB-AI-PROCURE-001 | Seven-Gate AI Vendor Evaluation Worksheet

Companion to [Before You Sign an AI Vendor Contract](./PB-AI-PROCURE-001_longform_package.md).
Status: ORIGINAL FREE IMPLEMENTATION WORKSHEET. NO VENDOR ENDORSEMENT. NOT LEGAL ADVICE.
Prepared: 2026-10-26. Sole YouTube channel: UCw2hs85TzIpdKwJtG-BSxzQ.

## Buyer intake
- Vendor / product / edition / model: ____________________
- Proposed business workflow and decision owner: ____________________
- Contract term and maximum committed spend: ____________________
- Intended data classifications: ____________________
- Systems, connectors and action permissions requested: ____________________
- Countries of operation, applicable law and specialist reviewers: ____________________
- Pilot owner / start / end / acceptance date: ____________________

## The seven decision gates
Complete the EVIDENCE column with an actual artifact, test result, contractual clause, named owner, and date. Status: GREEN = evidenced and accepted, AMBER = incomplete, RED = material unresolved risk, N/A = documented reason.

| Gate | Questions the buyer must answer | Minimum requested evidence | Owner | Status / due date |
|---|---|---|---|---|
| 1 DATA | What enters the system, where is it stored, how long is it retained, and is any input/output/log used for model training? | Field-level data map, retention/deletion schedule, contractual use restrictions, subprocessor list | Data protection / IT | |
| 2 AUTHORITY | Which tools and verbs are permitted? Who independently approves consequential actions? | Live permission matrix, least-privilege test, transaction-specific approval, stop/rollback test | Operations / security | |
| 3 SECURITY | Which parties handle data? What is the incident response and notification obligation? | Architecture, appropriate assurance evidence, incident clauses, contact, credential handling, prompt-injection test | Security / legal | |
| 4 PROOF | Does the product meet our own acceptance tests and baseline? | Test plan, representative sample, failure cases, error and exception measures, signed acceptance | Workflow owner / QA | |
| 5 ECONOMICS | What is the recurring verified cash effect after all variable, human and integration costs? | Unit-price schedule, cost caps, audited pilot measures, monthly cash bridge | Finance / procurement | |
| 6 CHANGE | How are model, feature, pricing, and subprocessor changes announced, tested and rolled back? | Change notice clauses, version record, test/rollback protocol, suspension procedure | IT / operations | |
| 7 EXIT | How do we export records and configurations, terminate integrations, and verify deletion? | Export sample, portability format, deletion evidence, transition support, exit fees and deadlines | Procurement / legal / IT | |

## Action permission matrix
List each action separately. A model instruction is not an authorization control.

| Verb | Data scope | Allowed role / tool credential | Independent approval | Reversible? | Audit record | Test result |
|---|---|---|---|---|---|---|
| Read request | Approved fields only | Read-only service role | N/A | Yes | | |
| Draft response | Internal staging queue | Draft-only role | Review before external send | Yes | | |
| Send email | Approved recipient and template | Outbound connector | Named reviewer | Depends | | |
| Change supplier bank details | Sensitive financial master | NO AGENT ACCESS | Human verification workflow | High risk | | |
| Approve invoice | Approved payment workflow | NO AGENT ACCESS | Designated financial approver | High risk | | |
| Export confidential records | Restricted | Deny by default | Security and data owner | Often irreversible | | |

## A 30-day pilot with stop rules
Days 1–5: Document baseline process, data map, permission inventory, costs and acceptance sample. Remove unnecessary data and permissions before integration.
Days 6–10: Configure read-only and draft-only pilot in a sandbox. Test malicious instructions inside documents, unauthorized tool requests, and data export restrictions.
Days 11–20: Run representative cases with human review. Record handling time, correctness, escalations, failures, cost per request, customer impact and reviewer effort. Capture every failed test.
Days 21–25: Re-test after fixes. Run an approved-change test, duplicate-action-after-timeout test, model-update regression test and rollback test.
Days 26–30: Finance verifies cash effects, security signs off technical boundaries, procurement validates terms, and the executive owner records GO / REVISE / NO GO.

STOP immediately for unauthorized state-changing actions, disclosure of protected data, inability to halt or reverse a critical workflow, unaccepted contractual data use, or material unexplained test failures. A fast average response does not override a failed critical control.

## Financial model, fictional worked example
Monthly request volume = 2,000.
Minutes released per request = 5.
Capacity released = 2,000 × 5 / 60 = 166.67 hours.
Fixed vendor fee = $1,200.
Variable fee = 2,000 × $0.15 = $300.
Monthly human oversight and exception handling = $700.
Total recurring operating cost = $2,200.
Verified avoided overtime = $900.
Verified avoided corrections = $500.
Verified recurring cash benefit = $1,400.
Net recurring monthly cash effect = $1,400 − $2,200 = -$800.
Setup and integration excluded. All values are invented teaching examples, not a real customer case.

For your own case:
Volume = ______; baseline minutes = ______; pilot minutes = ______; quality acceptance rate = ______.
Fixed fee = ______; variable fee = ______; human oversight = ______; integration amortization = ______.
Verified cash savings = ______; verified cash benefits = ______; recurring net cash = ______.
Noncash outcomes: turnaround time = ______; staff capacity = ______; service quality = ______; risk outcomes = ______.

## Executive decision record
- Critical unresolved RED gates: ____________________
- Residual risks explicitly accepted and by whom: ____________________
- Evidence reviewed, with dates and links: ____________________
- Financial result, cash and noncash separated: ____________________
- Decision: GO / REVISE / NO GO.
- Pilot owner: __________ Finance signoff: __________ Security signoff: __________ Legal/procurement signoff: __________
- Review date and next action: ____________________

This worksheet operationalizes PrismBay's original seven-gate teaching framework. Refer to the linked editorial package for primary-source context from NIST, FTC and OWASP. Verify local legal obligations separately.
