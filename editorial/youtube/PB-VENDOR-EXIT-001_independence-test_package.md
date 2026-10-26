# PrismBay AI | PB-VENDOR-EXIT-001 | Your AI Vendor Leaves Tomorrow. Does the System Still Work?

Prepared: 2026-10-26. Status: original editorial package, NOT rendered, NOT scheduled, NOT published.
Sole authorized channel: UCw2hs85TzIpdKwJtG-BSxzQ (@PrismBayAI).
Series: AI Systems Under Control. Format: 9–11 minute original explainer. Audience: founders, CFOs, COO/IT leaders, procurement directors, transformation teams.
Core promise: a practical, testable exit drill before signing or renewing a vendor-built AI agent engagement.

## Reporting discipline
On September 29, 2026, Gartner predicted that by 2028, 70% of enterprises would abandon agentic AI *built by vendor forward-deployed engineering* (FDE). This is a forecast about that specific delivery model, NOT a measured abandonment rate and NOT a forecast for all enterprise AI agents. The video must always preserve this qualification. PrismBay's five-part Independence Test is an original editorial framework, not a Gartner/NIST/NCSC checklist. Numerical examples are fictional and explicitly labeled. Do not use an actual vendor logo, invented customer outcome, or unsourced contract allegation.

## Finished narration, scene and proof plan

### 0:00–0:55 | Cold open: the vendor leaves
Your company has an AI agent that routes supplier requests, drafts answers and prepares weekly reports. The demonstration was impressive. The vendor's engineers configured the tools, wrote the integrations and fixed the exceptions. Now imagine their contract ends tomorrow. Who holds the credentials? Who understands the workflow? Can your team export the records, recover from a failure and make a safe change without calling the vendor? Those questions decide whether you bought an operating capability or a dependency. Today, we will run a five-part independence test that procurement and operations teams can use before renewal.

Visual: original animated system map. Vendor node disconnects. Four remaining nodes flash amber: DATA / ACCESS / RUNBOOK / COST. No stock footage of worried executives.

### 0:55–2:00 | What the Gartner forecast actually says
On September twenty-ninth, Gartner published a specific prediction: by 2028, seventy percent of enterprises will abandon agentic AI built by vendor forward-deployed engineering. Forward-deployed engineers are vendor personnel who work alongside the customer to build and integrate solutions. This is a forecast, not an observed failure rate. And it does not say seventy percent of all AI projects will fail. Gartner's warning is about engagement structure: ownership, knowledge transfer, long-term cost and the ability to operate independently. The practical response is not to reject outside expertise. It is to define what independence looks like before the first invoice.

Visual: headline date and scope. Highlight "forecast", "vendor FDE", "by 2028". Strike out the misleading phrase "70% of all AI agents fail".

### 2:00–3:20 | Test 1: Export the complete working record
Ask the supplier to export a realistic, non-sensitive test dataset, along with field definitions, decision history, configuration and links to source documents. Do not accept a screenshot or dashboard as proof of portability. Can another system read the files? Can you reconstruct why a specific request was classified? Do you know which records are yours to retain and which the vendor must delete? Record format, extraction limits, retention and deletion responsibilities in the contract. The UK government's AI procurement guidance explicitly advises buyers to address vendor lock-in. Export should be tested, not merely promised.

Visual: a 5-row export manifest with sample CSV/JSON filenames, ownership, format, checksum and deletion instruction. Mark all sample data FICTIONAL.

### 3:20–4:35 | Test 2: Own identities and revoke access
List every account, API token, integration and service identity used by the agent. For each one, identify the legal owner, permission scope, credential rotation procedure and emergency disable switch. If the vendor leaves, who can revoke its access without breaking your own systems? A vendor-controlled admin account with undocumented permissions is a transition risk. Keep execution privileges in your environment where feasible. Separate read, draft, approval and action permissions. The UK NCSC's secure AI development guidance recommends appropriate access controls and incident-management capability.

Visual: access-control ledger with green customer-owned credentials and amber vendor-managed credentials. Demonstrate one revoked test token; no real credentials displayed.

### 4:35–5:55 | Test 3: Replay one workflow without the vendor
Choose a representative request and run it in a sandbox using fictional records. Trace the input, model call, business rules, tool action, human review and audit event. Then intentionally introduce one failed API call. Does the process retry safely? Does it create a duplicate order? Can your staff identify the exact step and restore a known-good state? Ask the vendor to observe silently while your internal operator performs the test. If the team cannot explain or recover the workflow, the handover is incomplete even if the dashboard looks excellent.

Visual: original six-step swimlane. Simulate a failed tool call, duplicate-prevention lock and successful rollback. Show a clear FAIL before the corrected PASS.

### 5:55–7:05 | Test 4: Transfer the runbook, not a slide deck
Request an operating runbook: system architecture, data flow, dependencies, owners, release procedure, incident response, test cases, monitoring thresholds and rollback steps. Have an internal employee follow the runbook to change a low-risk business rule in a staging environment. Require evidence that the change passed tests. A training presentation is useful, but it does not demonstrate operational independence. The NIST AI Risk Management Framework addresses third-party and supply-chain risk in its Govern function. Our practical extension is to make the handover observable.

Visual: runbook checklist with operator initials, timestamp and a screenshot of a fictional staging test result.

### 7:05–8:25 | Test 5: Calculate the true exit bill
Imagine a fictional contract with a six-thousand-dollar monthly vendor fee. The organization estimates forty hours per month of internal support at fifty dollars per hour, plus one thousand dollars in model, monitoring and infrastructure expenses. The steady-state operating cost is nine thousand dollars per month. Now assume an exit requires one hundred twenty engineering hours at fifty dollars, plus two thousand dollars in migration testing. The one-time exit estimate is eight thousand dollars, before any contract penalties or service interruption. These numbers are illustrative, not market benchmarks. Compare that cost with the benefit you have actually verified. Include data extraction charges, IP restrictions, termination notice, knowledge transfer and temporary parallel operations. Never label hours released as cash savings without evidence of avoided spending.

Visual: arithmetic ledger: $6,000 + (40 × $50) + $1,000 = $9,000/month; (120 × $50) + $2,000 = $8,000 exit estimate. Prominent "ILLUSTRATIVE ONLY" watermark.

### 8:25–9:35 | The independence decision
Score each test from zero to two. Zero means no evidence. One means a document or vendor demonstration exists but your team has not completed the test. Two means your internal team has independently passed the test and preserved evidence. Ten points is the maximum. This is a PrismBay screening rubric, not a certification or universal threshold. Do not expand a high-consequence agent when access revocation or failure recovery is untested, regardless of the total score. Contract owners should require written remediation dates and a repeat drill. A good partner will welcome a clear handover standard because the outcome is measurable.

Visual: five-test scorecard. Show a hypothetical 7/10 with ACCESS=0, decision "HOLD / REMEDIATE", not "PASS".

### 9:35–10:15 | Closing and action
Before the next vendor demo, ask for one hour with your own operator and a sandbox. Export the records. Revoke a test identity. Replay a workflow. Follow the runbook. Estimate the exit bill. If the team can demonstrate those five capabilities, you have stronger evidence of control. If not, you know exactly what to put into the next statement of work. PrismBay AI helps founders, operators and executives implement practical AI business systems. Subscribe for evidence-based decisions, not automation theater.

Visual: five checks complete, then single CTA. No generic intro/outro or repetitive template.

## Title candidates for native long-form A/B testing
1. Your AI Vendor Leaves Tomorrow. Does Your Agent Still Work?
2. Gartner's 70% AI Forecast: The Vendor Exit Test Executives Need
3. Before You Renew an AI Agent Contract, Run These 5 Tests

## Three differentiated thumbnail concepts
A. Vendor connection cable unplugged from an original workflow map, big text "VENDOR GONE?".
B. Simple contract and red 70% forecast badge, big text "EXIT TEST"; footnote in video, not misleading on thumbnail.
C. Five-box control scorecard with a red ACCESS FAIL, big text "WHO OWNS IT?".
Test only for eligible long-form uploads using YouTube Studio. No native A/B test for Shorts.

## Three distinct derivative Shorts, with standalone payoff
S1, 45–55 seconds, forecast precision: Hook "A new forecast says 70% of a specific kind of vendor-built AI agent may be abandoned by 2028." Immediately clarify Gartner's vendor FDE scope and forecast status. Explain one independence question: can your team run it without the vendor? Distinct visuals: forecast-to-contract flow, not a reuse of the long-form timeline.
S2, 45–60 seconds, practical security: Hook "Your AI vendor leaves Friday. Who owns the API keys?" Show fictional credential ledger, one vendor-owned token, one customer-owned token, and a safe revocation test. Payoff: control identities before production. Distinct visual treatment: terminal-inspired audit board.
S3, 40–55 seconds, procurement economics: Hook "Your AI contract is $6,000 a month. The real operating bill might be $9,000." Explicitly label all figures as hypothetical, show support and monitoring cost, then point to exit/migration expenses. Distinct visual treatment: animated financial ledger.

## Metadata and distribution
Description opening: "What happens to a business AI agent when its vendor exits? This original five-part independence test covers data export, credentials, workflow recovery, runbooks and full exit cost. Gartner's September 29, 2026 prediction concerns agentic AI built by vendor forward-deployed engineering, not all AI agents."
Keywords: AI vendor lock-in, agentic AI procurement, vendor exit plan, forward deployed engineering, AI agent security, AI ROI, operational handover.
CTA after payoff: "PrismBay AI helps founders, operators and executives implement practical AI business systems."
Companion article: one-page Independence Test with fictional scorecard, source links and download-free copyable fields. Publish only where PrismBay-owned site/social write access is confirmed.

## Experiment record
Experiment ID: PB-VENDOR-EXIT-001.
Hypothesis: a timely, tightly qualified Gartner forecast plus a reproducible procurement test will outperform generic AI news in qualified watch time and subscriber conversion.
Target audience: procurement leaders, CFOs, founders and enterprise operations managers.
Format: 9–11 minute long-form, plus three nonduplicate derivative Shorts on later days.
Hook: vendor-loss operational consequence.
Proposed release window: 16:00 America/Guyana on a weekday, contingent on original render, independent narration/visual review, rights check and confirmation no scheduled collision. Metricool's October 26–November 1 best-time scores favor 16:00 on weekdays, but do not establish channel-specific optimal timing.
Success threshold: evaluate at 6h/24h/72h/7d. SCALE only if watch-time share and subscriber conversion outperform a comparable channel median with meaningful sample size; RETEST a substantially different title/thumbnail if impressions exist but click-through is weak; MODIFY if early retention falls; STOP for inaccurate claims, failed quality or rights checks. Do not infer performance from zero or missing Metricool rows.
A/B: test three genuinely different title-thumbnail pairs natively when feature available, long-form only.

## Evidence and citations for production fact check
1. Gartner, press release, 2026-09-29. Scope and 70% prediction: https://www.gartner.com/en/newsroom/press-releases/2026-09-29-gartner-predicts-70-percent-of-enterprises-will-abandon-agentic-ai-built-by-vendor-forward-deployed-engineering-by-2028
2. UK government, Guidelines for AI Procurement, section on avoiding vendor lock-in: https://www.gov.uk/government/publications/guidelines-for-ai-procurement/guidelines-for-ai-procurement
3. UK National Cyber Security Centre, Guidelines for Secure AI System Development, secure deployment and access controls: https://www.ncsc.gov.uk/collection/guidelines-secure-ai-system-development/guidelines/secure-deployment
4. NIST AI RMF Playbook, Govern 6 third-party/supply-chain risks: https://airc.nist.gov/airmf-resources/playbook/govern/
5. Australian Government Architecture, checklist for lock-in, portability and exit planning: https://architecture.digital.gov.au/design/checklist-lock-portability-and-exit-planning-considerations

## Production gate and swarm ownership
Trend Scout: Gartner's dated forecast, verified against primary press release.
Audience Problem Scout: contract renewal, vendor dependence, executive accountability.
Hook/Title Agent: three differentiated titles and Shorts hooks.
Research Agent: fact/scope qualifiers and source ledger above.
Visual/Editing Agent: original five-test diagrams and narration, no unreviewed generic template.
Thumbnail Agent: three original concepts; no stock-face bait.
Publisher/SEO Agent: inspect Metricool scheduled posts and validate brand 6945443/channel ID before upload; do not publish text-only YouTube posts.
Analytics Agent: compare real video-level views, watch minutes, retention proxies, subscribers at checkpoints.
Portfolio Allocator: keep this package queued until production quality is verified; no fabricated baseline, no paid advertising.

Publication state: EDITORIAL COMPLETE; VIDEO NOT YET PRODUCED; NO UPLOAD CLAIM.
