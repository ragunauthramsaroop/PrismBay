# PrismBay AI | PB-OPS-021 | The AI Agent Reliability Budget

Status: original long-form editorial script, not rendered or published.
Sole target channel: UCw2hs85TzIpdKwJtG-BSxzQ (@PrismBayAI).
Created 2026-10-21. Target length 8–10 minutes with original graphics and calculation pauses.
Audience: founders, operators and executives. All example numbers are hypothetical.

## 00:00 | The opening problem
Your AI agent completes 486 out of 500 business tasks. That is 97.2 percent success. Do you expand the system? The answer depends on the failures, the limits you agreed to before deployment, and whether the system stayed within its assigned responsibilities. Today we will build a five-part reliability scorecard for an AI workflow. It is designed to turn a demonstration into an accountable business process.

On screen: 500-cell original task matrix, 486 green, 14 red. Caption: "97.2% is a number, not a decision."

## 00:50 | Define successful work
Measure a completed business task, not a generated paragraph. Consider an assistant handling supplier service requests. A task passes when the agent uses the approved record, classifies the request correctly, prepares the right response, and completes the work on time. If the workflow requires a human sign-off, that sign-off is part of completion. Define a success checklist before testing. Keep simple requests and complex exceptions in separate groups.

On screen: four boxes: correct / supported / timely / approved. A task passes only when all four boxes pass.

## 02:00 | Calculate the routine error budget
A useful concept from site reliability engineering is an error budget. Teams agree on a reliability target and calculate how many ordinary failures fit within the target. This is an operating analogy, not an AI certification. Suppose the target for a pilot is 98 percent task success. At 500 tasks, the allowed routine failure count is ten. In our hypothetical pilot, fourteen tasks fail. The success rate is 486 divided by 500, or 97.2 percent. The system used 140 percent of its routine error budget.

Do not treat every failure as equal. A routine classification error differs from a serious control incident. Critical incidents require separate escalation and investigation, regardless of the average success rate. If the routine budget is exceeded, pause expansion and study the causes before the next test.

On screen: 500 × 2% = 10. Actual failures 14. Budget consumed 14 ÷ 10 = 140%.

## 03:15 | Find the failure pattern
Suppose six failures arise during document extraction, four during routing, and four during external tool calls. Each group needs a different response. Extraction may need field checks. Routing may need a narrower decision tree. Tool-call problems may need better retry and fallback handling.

Next, segment the task population. Imagine 400 routine requests and 100 complex requests. The system completes 396 routine requests and 90 complex requests correctly. Routine accuracy is 99 percent. Complex accuracy is 90 percent. The combined 97.2 percent score conceals a ten-point difference in performance. A sensible next experiment might expand only routine processing while keeping complex requests under closer review.

On screen: 6 + 4 + 4 = 14 failures. Side-by-side gauges: routine 99%, complex 90%.

## 04:35 | Assign permissions according to the task
Create three operating lanes. Green includes reading approved records and drafting suggestions. Amber includes actions requiring a named human reviewer before completion. Red includes actions outside the agent's approved role. Enforce these limits through application permissions and workflow approvals rather than relying only on written instructions to the model.

Keep an activity record: what information was used, what action was proposed, what decision the reviewer made, and what the system did afterward. A workflow owner must have authority to pause the process when controls fail. These are practical design choices consistent with the risk-management themes in NIST's voluntary AI Risk Management Framework and the OWASP guidance on large-language-model applications.

On screen: three original motion-graphic lanes, with a reviewer checkpoint and a blocked lane.

## 05:50 | Include correction cost
Low usage fees do not guarantee a low operating cost. In our example, 500 tasks at six cents each cost thirty dollars in direct processing fees. Suppose correction work takes three staff hours at thirty-five dollars per hour. That adds one hundred five dollars. The partial processing-and-correction total is one hundred thirty-five dollars. This figure excludes setup, integration, monitoring, oversight, and other costs. Do not present it as the complete cost of ownership.

Now ask whether the system saved paid overtime, reduced external invoices, increased capacity, or improved turnaround. Record capacity released separately from verified financial savings. Finance should validate the cash outcome. The business decision needs both quality and economics.

On screen: $30 processing + $105 correction = $135 partial cost. Large footnote: "Illustrative, not total cost."

## 07:00 | Use a weekly decision rule
Your weekly scorecard needs five entries: eligible task count, success rate, failure categories, control incidents, and measured business benefit after costs. Decide in advance what each result means.

Green means the reliability target passes, no critical issue is unresolved, and the workflow owner approves controlled expansion. Amber means ordinary performance misses its target: restrict the scope, repair the weakness, and retest. Red means a serious control failure: pause the affected workflow and investigate before resuming.

Our example has fourteen routine failures against a budget of ten. That is an amber result at minimum, with no automatic expansion. A serious incident would change the decision independently of the average accuracy score. The owner, not the model, makes the final operational call.

On screen: original five-row scorecard feeding into green, amber, and red decision paths.

## 08:15 | Closing
An AI system is ready for greater responsibility only when its limits are clear and its performance is measured against them. Define the work, set a target, count the failures, enforce permissions, and appoint a decision owner. Then expand only where the evidence supports expansion.

PrismBay AI helps founders, operators, and executives implement practical AI business systems. Subscribe for worked examples and operational frameworks.

## Evidence and production checks
All numbers are hypothetical and arithmetic has been checked: 486/500 = 97.2%; 500 × 2% = 10; 14/10 = 140%; 396/400 = 99%; 90/100 = 90%; 500 × $0.06 = $30; 3 × $35 = $105.
Primary sources:
NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
OWASP LLM project: https://genai.owasp.org/llm-top-10/
Google SRE error budgets: https://sre.google/workbook/error-budget-policy/
Use original task matrix, segment comparison, permission lanes, cost ledger, and stoplight scorecard. No generic template montage. Review audio, captions, rights, originality, and exact target channel before any publication.
