# PrismBay AI | PB-EXIT-DRILL-001 | The AI Vendor Exit Drill

Status: ORIGINAL LONG-FORM PRODUCTION SCRIPT. NOT RENDERED, NOT SCHEDULED, NOT PUBLISHED.
Prepared: 2026-10-25. Sole destination: YouTube channel UCw2hs85TzIpdKwJtG-BSxzQ (@PrismBayAI).
Format: 9–11 minute original walkthrough. Audience: founders, CFOs, operations leaders, procurement owners, IT/security and compliance teams.
Series: AI Systems Under Control. Separate from the Oct 25 FSB three-board-tests Short and the four-level agent-permission tutorial.

## Core promise
By the end, the viewer has a repeatable 45-minute *tabletop* test for switching off an AI vendor or agent without losing business records, uncontrolled tool access, or the ability to continue operations. The 45 minutes is a proposed exercise duration, not a proven industry standard. This is an educational demonstration with fictional data, not legal advice or a claim of a tested live implementation.

## Finished narration and visual directions

### 00:00–00:55 | Cold open
Your company automates supplier onboarding with an AI vendor. Then the vendor announces a major price increase, a service outage, or a security incident. Your team says, “We can turn the AI off.” Fine. Show me how. Which employee holds the credentials? Where are the source documents? Who can revoke access? What happens to a purchase request halfway through processing? If your answer is a support ticket to the same vendor you are trying to leave, you have a dependency worth testing.

Today we are running a fictional 45-minute AI vendor exit drill. We will produce five pieces of evidence: a system map, a data export, a credential revocation record, a manual fallback test, and a recovery decision. The goal is not to predict every failure. It is to prove the business knows how to stop safely.

Visual: a fictional vendor status banner turns red. Freeze frame on five empty evidence boxes. No generic intro.

### 00:55–02:05 | What the drill covers
Our example is a fictional mid-sized company with an AI-assisted supplier request workflow. The assistant reads approved supplier forms, classifies missing information, drafts responses, and writes a status to an internal queue. A human approves external messages and vendor record changes. The agent never holds payment authority. Those are design assumptions for the exercise, not observations from a real company.

An exit drill is different from an ordinary backup. A backup asks whether a file exists. An exit drill asks whether the team can continue the service after losing a dependency. We test four failure modes: the vendor API is unavailable, the contract ends, access tokens are suspected of exposure, and an exported data set is incomplete. We do not test all four in production. We use a sandbox and fictional records.

Visual: four failure-mode cards, then a split-screen: “BACKUP EXISTS” versus “WORK CONTINUES.”

### 02:05–03:20 | Minutes 0–10: draw the dependency map
Start the timer. Draw five boxes: input, model/vendor, orchestration, internal system, and human approval. Put an arrow wherever data moves. Next to each arrow, write the data class and credential owner. Mark every external destination. Add a column for what breaks if the vendor disappears.

In our fictional workflow, an employee submits a supplier form. A workflow engine sends only approved fields to the AI provider. The model suggests missing fields. The internal system stores the source form and decision record. A buyer approves any external response. If the model is unavailable, the buyer should still see the source form and work queue.

Ask one practical question: is the record of truth held by your business system or trapped inside the vendor interface? If the answer is unclear, the exit drill has already found work.

Visual: original five-box data-flow diagram with credentials and owner labels. Animate one arrow at a time.

### 03:20–04:30 | Minutes 10–20: prove you can retrieve the records
Export ten fictional supplier cases with original documents, status history, decisions, and timestamps. Do not accept “export completed” as proof. Compare the exported case count with the source system. Open three records. Verify the original attachments are readable, timestamps survive, and status values mean the same thing. Check whether the export includes the agent's rationale and human approval trail, where relevant and available.

Our fictional scorecard starts with ten source cases. Suppose the export returns nine. That is a failed completeness check: nine divided by ten equals 90 percent. It does not mean the business has 90 percent exit readiness. It means one test failed. Stop the drill and log the missing record.

Visual: ten numbered case cards, nine green, one amber. On-screen formula 9/10 = 90% completeness, TEST FAILED.

### 04:30–05:40 | Minutes 20–30: revoke access and stop queued actions
Next, suspend the sandbox integration. Revoke the service token, disable scheduled jobs, and block the vendor's outbound route at the application boundary. Test that a new request cannot reach the provider. Then inspect the queue for work already in progress.

The hardest question is not whether the login screen says “disabled.” It is whether a previously queued action will still run. For each queued action, record its idempotency key or transaction identifier, status, owner, and permitted recovery step. In our exercise, a drafted supplier email stays in the internal queue. It must not send after access is revoked. An independent control should enforce this, rather than trusting a model instruction.

Visual: red stop switch; queued items visibly remain held; a separate server-side access check denies a request.

### 05:40–06:50 | Minutes 30–40: run the fallback
Now process three new fictional requests without the AI vendor. One is complete. One is missing a tax document. One contains conflicting supplier details. The human operator must access the source files, apply documented rules, and record an accountable decision. Time each case. The purpose is to prove continuity, not to pretend manual work is as fast as automation.

Suppose the fallback takes six, eight, and twelve minutes. That is 26 minutes of handling across three cases. The average is 8.7 minutes per case, rounded. The sample is too small to forecast production capacity. But it gives the operations owner a concrete starting point for staffing and service-level planning.

Visual: original three-lane manual workflow. Clock counts 6 + 8 + 12 = 26 minutes. Label all figures HYPOTHETICAL.

### 06:50–08:05 | Minutes 40–45: score the exit
The last five minutes belong to the accountable owner. Do not average away a critical failure. Use five pass/fail gates. Gate one: dependency map names every integration and owner. Gate two: exported records reconcile with the source. Gate three: vendor access is revoked and independently tested. Gate four: queued actions cannot execute unexpectedly. Gate five: people can continue the critical service using a documented fallback.

A failure on a critical gate means the exit test fails, even if the other four pass. Write down the failed gate, evidence, owner, deadline, and retest date. In the fictional example, the missing tenth export record causes a FAIL. That is useful information before a real emergency.

Visual: five-gate control panel with gate two red. No misleading overall “80% safe” score.

### 08:05–09:15 | Turn the drill into a procurement question
Before buying another AI tool, ask the vendor for a practical demonstration of export format, deletion and retention terms, integration credentials, subcontractor dependencies, outage procedures, and contract exit assistance. A promise in a sales deck is not the same as a tested workflow. Ask for the evidence your own team needs to operate without the provider.

The Financial Stability Board's October 15, 2026 sound practices address third-party AI dependencies for financial institutions. They are sound practices, not a new universal law. NIST's voluntary AI Risk Management Framework addresses third-party monitoring, response, recovery, and decommissioning. Our 45-minute drill is PrismBay's educational implementation example, not an official FSB or NIST checklist.

Visual: procurement scorecard with six evidence fields. Source titles appear unobtrusively on screen.

### 09:15–10:05 | Closing payoff
Here is your next action. Pick one AI-assisted workflow. Use fictional or sandbox records. Give the team 45 minutes. Make them show the map, export, revocation test, manual fallback, and recovery decision. If they cannot, fix the dependency before giving the agent more authority.

AI ROI is not only time saved while the tool works. It also includes the cost of keeping the business operating when the tool stops. PrismBay AI helps founders, operators and executives implement practical AI business systems. Subscribe for evidence-based workflow tests and executive decision frameworks.

Visual: all five evidence boxes filled, with the export box flagged for retest. End cleanly.

## Three meaningfully different title and thumbnail pairs
A. Title: Could Your Business Survive an AI Vendor Shutdown? Run This 45-Minute Test
   Thumbnail: one giant red vendor OFF switch, five empty evidence slots. Text: “EXIT TEST”.
B. Title: Before Buying an AI Agent, Demand This Vendor Exit Test
   Thumbnail: procurement contract on left, unplugged connector on right. Text: “PROVE EXIT”.
C. Title: Your AI Vendor Goes Offline. Here Is the 5-Step Business Recovery Drill
   Thumbnail: broken workflow arrow repaired by a manual route. Text: “PLAN B”.
Choose one pair for publication and use native long-form title/thumbnail A/B testing if available. Do not test on Shorts.

## Three derivative Shorts, distinct hooks and scenes
S1 | 35–45 sec | procurement angle | “Your AI vendor says your data is portable. Ask for ten records, then count them.” Show 10 fictional records, export returns 9, explain why the export test fails. CTA: “See the full vendor exit drill on PrismBay AI.”
S2 | 40–50 sec | engineering angle | “Turning off an AI agent does not guarantee its queued actions stop.” Show token revoked but an old queue item waiting, then server-side deny. CTA: “Test the queue before granting more access.”
S3 | 40–55 sec | operations angle | “If your AI vendor disappears today, who processes tomorrow's supplier requests?” Show three fictional cases and manual fallback. CTA: “Subscribe for practical AI business systems.”
Each derivative requires separate original scene compositions and unique narration. No repeated template with title swap.

## Experiment design
ID: PB-EXIT-DRILL-001.
Hypothesis: operational exit readiness, demonstrated through a concrete failed test, drives stronger long-form qualified watch time and relevant subscriber conversion than generic AI risk lists.
Audience: founders, procurement leaders, IT/security, CFOs and operations managers.
Format: 9–11 minute long-form, followed by 3 nonduplicate Shorts on different days.
Primary hook: vendor outage plus five evidence tests.
CTA: subscribe only after worked example and at close.
Publishing time: not assigned; select after reviewing the existing calendar and channel-specific audience data.
Success thresholds: at 6h technical review and impressions; at 24h first-30s retention and title/thumbnail alignment; at 72h watch minutes, AVD and comments; at 7d compare watch time per impression and subscribers per 1,000 views to comparable channel median. SCALE only with >=30% improvement and a meaningful sample. RETEST title/thumbnail if CTR weak but retention strong. MODIFY opening if early retention weak. STOP for unsupported claims, licensing or originality failures. Missing data => PENDING, never a fabricated score.
Publishing QA: verify audio pronunciation, readable diagrams on mobile, caption sync, no unlicensed imagery, synthetic voice disclosure when appropriate, fictional-example labels, source attribution, exact destination channel.

## Source verification, accessed 2026-10-25
Financial Stability Board, 15 October 2026, final 12 sound practices for financial institutions. Includes third-party AI dependencies, human oversight and AI lifecycle risk management. Guidance, not a new law:
https://www.fsb.org/2026/10/fsb-finalises-sound-practices-for-the-responsible-adoption-of-artificial-intelligence-ai/

NIST AI RMF Core, MANAGE 3 (third-party AI risks) and MANAGE 4 (response, recovery, decommissioning), voluntary:
https://airc.nist.gov/airmf-resources/airmf/5-sec-core/
https://airc.nist.gov/airmf-resources/playbook/manage/

OWASP GenAI and Agentic AI Exploit Roundup Q3 2026, examples of tool misuse, overbroad access and out-of-scope actions. Do not imply fictional PrismBay scenario occurred in a named company:
https://genai.owasp.org/2026/10/08/genai-and-agentic-ai-exploit-roundup-q3-2026/

Originality: the 45-minute tabletop structure, fictional company, five evidence gates, arithmetic and story are original PrismBay AI editorial constructs. All numerical illustrations are hypothetical.
