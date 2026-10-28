# PrismBay AI | Long-form production master | 2026-10-28 13:43 Guyana

Target: `UCw2hs85TzIpdKwJtG-BSxzQ` / `@PrismBayAI`. Metricool brand `6945443`. Original, unpublished editorial script. Zero paid spend. Do not schedule before voice, captions, sourcing, mobile preview and final approval. No new channel.

## Experiment and release metadata

Series: AI Systems Under Control, episode 1.
Working title: **How to Stop AI Agent Cost Overruns: Three Controls That Work**.
Audience: founders, CFOs, operations directors and IT owners responsible for agent budgets.
Hypothesis: a worked financial example plus an implementation checklist generates higher qualified watch time and subscriber conversion than a generic AI-agent news roundup.
Format: 16:9 long-form; estimated 8:30–10:00 at 135–150 spoken words/minute. No generic intro.
Opening: budget anomaly and its cause within first 20 seconds.
CTA: after viewers receive the controls and worksheet, invite subscription to PrismBay AI for practical AI business systems.
Candidate time: Wednesday or Thursday near 16:00 America/Guyana, subject to fresh audience data, release QA and calendar collision check.
Pre-registered success: 72-hour average view duration >= 35% of total duration AND 72-hour views >= 1.5x median of previous five comparable long-form videos, plus >= 1 attributed subscriber. If baseline or attribution is absent, classify INSUFFICIENT_DATA, not SCALE. Review 6h, 24h, 72h, 7d.

## Full original spoken script, scene by scene

### 00:00–00:50 | Cold open, the cost anomaly

Your AI agent handled the same number of tasks this month as last month. But the bill climbed from six hundred dollars to twenty-four hundred. Nothing obvious changed in the dashboard. So what happened?

Here is the explanation. A workflow can repeat tool calls, retry failed steps, or ask another model for help. If nobody measures the number of paid actions required for an accepted result, the budget can rise even while the workload stays flat.

I will show the math, then give you three controls to put in place before an agent touches your business: a spending limit, an authority limit, and an evidence trail. The example is fictional, with clear assumptions, so you can replace the numbers with your own.

[Visual: identical 6,000-task counters. Cost rises from $600 to $2,400. Permanent label: FICTIONAL EXAMPLE.]

### 00:50–02:05 | Make the hidden variable visible

Start with two hundred tasks per day, for thirty days. That is six thousand tasks. Assume each paid model or tool call costs two cents. The exact price is hypothetical, not a vendor quote.

In month one, each task uses five paid calls. Six thousand times five times two cents equals six hundred dollars.

In month two, each task uses twenty paid calls. Six thousand times twenty times two cents equals twenty-four hundred dollars. The task count did not change. The paid calls per task rose fourfold.

This calculation isolates call charges. It excludes hosting, data storage, external software, integration, human review, and the cost of fixing mistakes. If those costs rise too, the total bill can be higher.

The metric to watch is not only cost per call. Watch paid calls per attempted task, cost per accepted result, and the percentage of tasks that fail or need human repair. Those three numbers expose whether your workflow is doing useful work or paying to repeat itself.

[Visual: ledger: 200 × 30 = 6,000 tasks; 6,000 × 5 × $0.02 = $600; 6,000 × 20 × $0.02 = $2,400. Separate line: $1,800 difference.]

### 02:05–03:05 | Why this matters beyond a hypothetical example

There is a reason to take these controls seriously. On October twenty-second, Cognizant published a survey of two hundred and fifty senior FinOps leaders at large organizations in the United States, United Kingdom and India. Seventy-two percent of the surveyed organizations had exceeded their AI budgets in the preceding twelve months. The survey was vendor-sponsored and does not establish the rate for every business.

The useful takeaway is narrower: leaders need cost visibility tied to work performed, not a dashboard showing token totals without a business outcome.

On October twenty-seventh, IBM announced new AI-agent identity and control capabilities. Its announcement separates currently available evaluation functions from discovery and containment functions described as technology previews. Vendor announcements are not independent evidence of customer savings.

These developments point toward the same operating discipline. Count what an agent spends. Define what it is allowed to do. Preserve proof of the result.

[Visual: dated source cards; source names and survey scope; small footnote: vendor-reported findings, not PrismBay performance.]

### 03:05–04:30 | Control one, spending limits with a real stop

The first control is a budget limit at three levels.

At the individual call level, set a maximum cost and maximum response size where your provider supports them. At the task level, limit the number of paid calls and retries. At the daily level, stop the workflow when its approved spending allocation is reached.

Suppose a task is allowed eight paid calls. If call nine becomes necessary, do not let the agent silently keep going. Pause the task, log the reason, and route it to a person or an approved fallback.

Here is the distinction between an alert and a control. An email saying you spent too much is an alert. A budget enforcement point that blocks the next charge is a control.

You also need a failure rule. When a tool times out, the agent should not retry forever. Set a retry count, a backoff interval, and an escalation path. When the task fails, record the failure. Do not label it as a completed result.

For a small pilot, a simple ledger and a wrapper around paid tool calls are enough to test this design. Production enforcement requires reliable accounting and provider-specific limits.

[Visual: call 1–8 green, call 9 blocked. Flow: APPROVE / FALLBACK / STOP. Do not present a mock dashboard as a live customer system.]

### 04:30–05:55 | Control two, scoped authority

The second control is an authority limit. A useful agent needs enough access to complete a defined job, but not unlimited access to the company.

Take a purchasing assistant. It might read an approved supplier catalogue and prepare a comparison. That does not mean it should place orders, alter banking details, or approve invoices without separate authorization.

Give each agent a named owner, a specific job, and only the permissions required for that job. Use short-lived credentials where supported. Keep payment, deletion, external publication, and other irreversible actions behind an explicit approval step. Make sure a responsible operator can revoke access.

Think of the workflow as a series of gates. Read approved information. Propose a decision. Validate the proposal. Obtain approval for a sensitive action. Execute. Verify the result.

A prompt that says, 'Do not spend money,' is not a financial control. The actual tool must enforce the restriction. A written policy helps, but a blocked transaction is stronger evidence.

[Visual: permissions table: READ supplier catalogue = YES; DRAFT comparison = YES; CHANGE bank details = NO; PLACE order = HUMAN APPROVAL.]

### 05:55–07:15 | Control three, evidence tied to accepted outcomes

The third control is an evidence trail. For each run, record a task identifier, its owner, the input category, every tool call, cost, retry, exception, human approval, and final outcome.

Do not store unnecessary personal information in the log. Protect sensitive records and define a retention period.

Then create an acceptance test. If the agent extracts invoice data, compare the fields against a checked reference. If it produces a supplier shortlist, check the requirements and source dates. If it drafts an email, a reviewer approves before sending.

Now calculate the metric that matters: total operating cost divided by accepted outputs. Include the human review and rework costs where you have reliable data.

Here is a second fictional example. An agent completes one hundred tasks, but only eighty pass quality checks. The model and tool charges are forty dollars. Human review and corrections cost another sixty dollars. The combined one hundred dollars divided by eighty accepted outputs equals one dollar and twenty-five cents per accepted result.

If you only report forty cents per attempted task, you hide the cost of failed results and human repair. That makes the agent look cheaper than the workflow really is.

[Visual: 100 attempts → 80 accepted; $40 tool + $60 review = $100; $100 / 80 = $1.25 per accepted result. Label: FICTIONAL EXAMPLE.]

### 07:15–08:35 | A pilot scorecard a manager can use

Before scaling an agent, run a controlled pilot with a written scorecard. Pick one workflow with clear inputs and a measurable outcome. Record the manual baseline: cost, elapsed time, error rate, and human effort. Then run the agent on a comparable task set.

Measure six items. One: accepted output rate. Two: cost per accepted output, including review. Three: median and slow-end completion time. Four: tool calls and retries per task. Five: unauthorized-action attempts and blocked actions. Six: operator time spent on exceptions.

Set pass and stop conditions before the pilot. For example, stop automatically if a task exceeds eight paid calls, if an approval is missing, or if a required field fails validation. Those numbers are illustrative and should be tuned to the actual workflow.

Do not calculate return on investment from time saved unless the time has a defensible value. Released staff capacity is not the same thing as cash savings. Show both separately.

When the pilot passes, increase volume in stages. Check whether cost per accepted output stays stable as volume grows. If quality drops or exception handling rises, do not scale on the strength of a headline productivity percentage.

[Visual: six-column pilot scorecard. Green/amber/red based on preregistered criteria, not fabricated customer data.]

### 08:35–09:20 | Decision and subscriber promise

Here is the decision framework in one sentence. Do not approve an AI agent because it answers quickly. Approve it when its cost, authority and accepted outcomes are measurable.

Before your next rollout, ask three questions. What stops spending when the workflow goes wrong? What prevents an unauthorized action? And what evidence proves the task was completed correctly?

If the answers are unclear, run a smaller pilot and fix the controls before giving the agent more responsibility.

PrismBay AI helps founders, operators and executives implement practical AI business systems. Subscribe for the next breakdown, where we will turn this scorecard into a simple workflow you can inspect and adapt.

[Visual: three checks: SPEND / ACCESS / PROOF. End screen, no unsupported monetization claim.]

## Packaging and native A/B candidates for long-form only

A. Title: `How to Stop AI Agent Cost Overruns`. Thumbnail: single $600 → $2,400 cost comparison, label FICTIONAL.
B. Title: `Your AI Agent Needs a Budget Kill Switch`. Thumbnail: one red STOP button over a looping workflow, two-word text STOP THE LOOP.
C. Title: `3 Controls Before AI Agents Touch Your Business`. Thumbnail: three large icons for COST, ACCESS, PROOF with one agent node.

Run eligible native title/thumbnail A/B testing only through authorized YouTube Studio on the existing channel. Do not claim an A/B test was launched. Shorts have no native A/B test.

## Two distinct derivative Shorts, later production only

Short 1, `An AI Agent Alert Is Not a Spending Limit`: cold open, 'An alert tells you the bill is high. A stop rule prevents the next charge.' Demonstrate eight allowed paid calls and a ninth blocked call. Close with the practical rule: define per-task and daily ceilings before deployment. No reused long-form opening.

Short 2, `Why 40 Cents Per AI Task Is Misleading`: cold open, 'Your dashboard says forty cents. Your real accepted result costs one dollar twenty-five.' Explain 100 attempts, 80 accepted, $40 tool costs plus $60 review. Label all figures fictional. Close with cost per accepted result.

## Production and compliance gates

Use original motion diagrams and clear 16:9 layout. Build the fictional ledgers directly from the equations. Display source dates and vendor-funded research caveats. Do not represent IBM preview features as generally available. Keep a separate fact-check sheet. Produce an original voice track and burned or verified platform captions. Inspect a complete export with audio and real-device readability. Publish only after explicit editorial approval, fresh duplicate-calendar check and verification of channel ID. No paid ads, bought engagement, or misleading thumbnail. `publicationApproved=false`.

## Primary sources checked 2026-10-28

- Cognizant, 2026-10-22, survey scope and budget findings: https://news.cognizant.com/2026-10-22-Introducing-Cognizant-AI-Nexus-helping-enterprises-govern-the-cost,-quality-and-results-of-AI
- IBM, 2026-10-27, agent identity, access, evaluation, preview qualifications: https://newsroom.ibm.com/2026-10-27-ibm-introduces-identity-and-control-for-ai-agents,-securing-frontier-intelligence-for-the-enterprise
- YouTube official YPP threshold changes, checked 2026-10-28: https://support.google.com/youtube/blog/451804019/updates-to-the-youtube-partner-program-new-earning-opportunities-changes-to-eligibility

Research limitations: survey is vendor-funded; scenario values are hypothetical; no real PrismBay or customer revenue outcome is asserted.