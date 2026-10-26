# PrismBay AI | PB-AI-PROCURE-001 | Before You Sign an AI Vendor Contract

Status: ORIGINAL, RESEARCHED LONG-FORM EDITORIAL PACKAGE. NOT RENDERED, NOT SCHEDULED, NOT PUBLISHED.
Prepared: 2026-10-26. Sole channel: UCw2hs85TzIpdKwJtG-BSxzQ (@PrismBayAI).
Series: AI Systems Under Control. Target duration: 9–11 minutes.
Audience: founders, CFOs, procurement directors, IT leaders, operations heads, legal and compliance teams.

## Original editorial thesis
An AI purchase is a workflow, data-access, and economic decision, not a feature comparison. PrismBay's original **Seven-Gate AI Vendor Decision** makes seven buyer-side questions visible before commitment: DATA, AUTHORITY, SECURITY, PROOF, ECONOMICS, CHANGE, EXIT. This is a practical editorial checklist, not a mandatory legal standard or a certification from NIST, FTC, or OWASP. Apply local law and seek qualified contract review where needed.

## Narration script

### 0:00–0:55 | Cold open: the demo versus the invoice
An AI vendor shows your leadership team a remarkable demo. Their assistant processes a supplier request in seconds. The sales slide says your business will save 167 hours every month. Your team wants to sign. Here is the problem: the demo has not answered where your data goes, which actions the assistant is allowed to take, what happens when it fails, or whether those hours create one dollar of cash savings.

Today I will walk through seven gates to put in front of every serious AI vendor. We will use a fictional procurement workflow, calculate its actual economics, and end with a one-page decision sheet your team can reuse. You do not need to become a machine-learning engineer. You need to ask questions the vendor must answer with evidence.

Visual: full-screen contrast, glossy demo counter on the left, unsigned purchase agreement and seven red checkboxes on the right. No animated channel intro.

### 0:55–2:05 | Gate one: DATA
Start with data, not features. Ask exactly which records the service receives: names, supplier bank details, contract prices, customer information, internal documents, and system logs. For each category, write down the purpose, storage location, retention period, and deletion procedure.

Then ask a separate question: will our prompts, uploads, outputs, or logs be used to train or improve a model? A vendor's general marketing promise is not the same as the terms for your plan, API, and subcontractors. Ask for the contractual commitment and the administrative setting. Check whether an opt-out covers all relevant data types and retention pathways.

In a fictional supplier-request pilot, the system needs a request number, approved vendor ID, attachment status, and limited order fields. It does not need a complete bank-account directory. Reduce the input before negotiating what the vendor promises to protect.

Visual: animated data map. Green: approved request fields. Red: unnecessary banking records. Separate DATA IN / DATA KEPT / DATA USED FOR TRAINING.

### 2:05–3:10 | Gate two: AUTHORITY
The next gate is authority. The model might be brilliant at writing a payment recommendation, yet have no business holding credentials to release funds. Ask for a tool-by-tool access matrix. Can the service read? Draft? Propose? Send? Change? Delete? Pay?

For each state-changing action, name the owner and the independent approval control. A line in a prompt saying “always ask permission” is not an enforceable permission boundary. A strong design uses restricted service credentials, application-side authorization, transaction-specific approvals, logs, and a tested stop mechanism.

In our example, the assistant reads a request, identifies missing attachments, and drafts a buyer response. It cannot add a vendor, modify banking details, or approve an invoice. That narrow scope is a commercial requirement, not a limitation to hide.

Visual: real access matrix with five verbs. Show READ and DRAFT permitted, CHANGE BANK and PAY technically blocked.

### 3:10–4:15 | Gate three: SECURITY
Third, ask who else sits in the chain. The application, cloud provider, model provider, data processors, plug-ins, and connected tools form a service. Ask the vendor to identify relevant subprocessors, where they process data, how credentials are managed, and how security events reach your team.

Do not accept a vague “enterprise grade” claim. Ask for the specific security evidence appropriate to the risk, independent assessment scope where available, incident notification terms, recovery expectations, and the responsible contact. Check whether the contract and technical controls agree.

Now test one bad day. A malicious instruction appears inside a supplier attachment. The assistant must treat it as untrusted content, not as permission to export records or change the payment destination. If the vendor cannot explain the boundary and demonstrate a safe failure, the procurement decision is not ready.

Visual: supply-chain diagram with named links and a red malicious document stopped at a policy gate.

### 4:15–5:20 | Gate four: PROOF
Fourth, demand proof under your own conditions. A sales benchmark is not your baseline. Before buying, select a representative sample, document how work is done today, and define pass and fail criteria.

For supplier requests, measure the share processed correctly, the share escalated to people, time to decision, correction rate, and the frequency of risky exceptions. Test ordinary cases, incomplete files, contradictory instructions, changing vendor records, and system failures. Make the vendor show its evidence and failure handling.

Your acceptance plan needs an owner, sample size, test environment, and stop rule. Do not let a polished demonstration replace a controlled pilot. A vendor should explain what the product cannot reliably do as clearly as what it does well.

Visual: actual before/after workflow, then a five-row test dashboard including a visible failed case and its remediation.

### 5:20–6:45 | Gate five: ECONOMICS
Now the numbers. Assume a fictional company handles 2,000 supplier requests per month. The proposed system saves five minutes of manual handling per request. Two thousand times five is 10,000 minutes, or about 167 hours of capacity. That is not automatically 167 hours of payroll reduction.

Suppose the vendor charges $1,200 per month plus fifteen cents per request. At 2,000 requests, variable charges add $300. Human review, exception handling, and administration cost another $700. The monthly operating cost is $2,200, before setup and integration.

Suppose the business verifies $900 of avoided overtime and $500 of avoided correction costs. Verified recurring cash benefit is $1,400. Subtract $2,200 and the net monthly cash effect is negative $800. The workflow might still be worth pursuing for speed, service, or strategic reasons. But the business case must say so openly.

Ask the vendor to specify the billable unit, minimum commitments, price escalators, overage charges, integration costs, and what happens when a human needs to redo a failed output. Measure released capacity separately from cash saved.

Visual: large 167 HOURS ≠ $167? Avoid misleading dollar analogy. Show 167 HOURS RELEASED, $1,400 VERIFIED BENEFIT, $2,200 COST, -$800 NET MONTHLY CASH.

### 6:45–7:45 | Gate six: CHANGE
Sixth, decide what happens after the contract is signed. AI products change. Models, prompts, retrieval systems, pricing, safety controls, and subcontractors can change even when the product name stays the same.

Ask which changes require notice, which changes require customer approval, and how your team tests an update before it affects live decisions. Keep a version record of model and workflow configurations. Define rollback steps, change windows, and a contact for urgent suspension.

For the procurement example, a model update that increases false “missing document” flags might overwhelm buyers. Without change monitoring, your monthly savings estimate silently becomes obsolete. Ask for a process to measure drift against the acceptance baseline.

Visual: version timeline. An update causes an exception-rate spike, triggering rollback to the approved configuration.

### 7:45–8:45 | Gate seven: EXIT
Finally, plan the exit before entry. If the vendor becomes unsuitable, expensive, unavailable, or acquired, what happens to your records and workflow? Ask for export formats, timing, fees, configuration portability, log access, and the process for deleting retained data and backups under the contract.

A practical exit test is simple: select a sample of fictional records and prove you can retrieve them in a usable format. Confirm what stays with your organization: prompt templates, workflow rules, audit evidence, training material, and integrations you paid to develop. The answer depends on negotiated terms, not an assumption about ownership.

Do not confuse a promise to delete with proof of deletion. Specify the evidence, deadlines, exceptions, and who signs off. Exit planning protects continuity and negotiating leverage.

Visual: split-screen “EXPORT VERIFIED” versus “LOCKED IN”, with an actual sample CSV schema and deletion certificate checklist.

### 8:45–10:00 | The decision meeting
Put all seven gates on one page: DATA, AUTHORITY, SECURITY, PROOF, ECONOMICS, CHANGE, EXIT. Assign each a named owner, required evidence, current status, and next action. Green means the control has been demonstrated and accepted. Amber means evidence is incomplete. Red means a material risk has no acceptable mitigation.

Do not add up seven colors into a false scientific score. A single red gate involving uncontrolled payments or prohibited data use might be enough to stop deployment. Treat the checklist as a structured decision record, not a substitute for legal review or technical testing.

Here is the executive question: “What evidence would make us decline this purchase?” Ask that before the vendor demonstration. Then run a narrow pilot, validate cash effects, and expand only when quality and control results justify it.

PrismBay AI helps founders, operators and executives implement practical AI business systems. Subscribe for the next practical teardown, where we turn vendor promises into a 30-day acceptance scorecard.

Visual: one-page seven-gate worksheet, close on one concrete owner/evidence/status table. No repetitive template montage.

## Long-form title candidates for native A/B testing
A. Before You Buy AI Software, Ask These 7 Questions
B. Your AI Vendor Promises ROI. Run This $800 Reality Check
C. AI Procurement for Executives: The Contract Controls Most Teams Miss

## Distinct thumbnail concepts
A. An unsigned contract and seven bold checkbox rows, one red. Minimal text: “SIGN OR STOP?”
B. Large fictional equation, 167 HOURS / -$800, with a small invoice icon. Text: “ROI TRAP”.
C. A locked data pipeline and an access badge, with the vendor contract in the background. Text: “WHO CONTROLS IT?”
These are editorial concepts. Only test native title/thumbnail variants on eligible long-form uploads and only after rendering.

## Three standalone derivative Shorts
S1, 40–55 seconds, finance angle. Hook: “Your AI vendor says 167 hours saved. The cash result might be negative.” Animate the complete fictional $1,400 versus $2,200 equation. Payoff: separate capacity from verified cash. Distinct visual system: ledger and animated arithmetic.
S2, 35–50 seconds, security angle. Hook: “Your AI contract says the model is secure. Who holds the payment credentials?” Show permission matrix and independent approval gate. Payoff: restrict tools and test failure. Distinct visual system: access control and security state diagram.
S3, 45–60 seconds, procurement angle. Hook: “One AI contract clause matters most when you want to leave.” Show export, data deletion and rollback test. Payoff: negotiate exit evidence before signing. Distinct visual system: portable data schema and exit timeline.
Do not release near-duplicates or reuse an identical montage.

## Experiment record
ID: PB-AI-PROCURE-001. Hypothesis: a decision-ready seven-gate vendor checklist and transparent ROI example outperform generic AI tool roundups among operators and executives.
Target audience: CFOs, procurement leaders, founders, operations directors.
Format: original 9–11 minute long-form tutorial with three independent follow-up Shorts.
Hook: a high-confidence vendor demo that fails a real cash test.
CTA: subscribe after first complete practical example and at close, if natural.
Publish date: NOT SET. Use verified calendar and channel-specific data when available.
Baseline: seven subscribers as last reported October 26, but no trustworthy video-level retention or subscriber conversion data. Do not invent a performance baseline.
Provisional acceptance gates: 6h check upload and audience fit, 24h examine first-30-second retention when available, 72h examine traffic and comments, 7d compare qualified watch time and subscribers per 1,000 views with prior comparable videos. SCALE only after sufficient sample and >=30% advantage over a valid channel median; RETEST when CTR is weak but retention strong; MODIFY when early retention fails; STOP on originality, sourcing, or safety defects.
Production gates: fact-check on-screen arithmetic, original diagrams, intelligible narration, accurate captions, visual variety, licensed media, clear synthetic-content disclosure where applicable, final audio listening review. No publication until these pass.
Status: RESEARCHED AND SCRIPTED. No video or schedule exists.

## Source and accuracy notes
1. NIST AI RMF 1.0 and Generative AI Profile, voluntary cross-sectoral risk-management guidance. NIST explicitly discusses third-party acquisition, due diligence, SLAs and testing. https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence
2. NIST AI RMF Playbook, third-party risks and documented controls, Manage 3. https://airc.nist.gov/airmf-resources/playbook/manage/
3. NIST AI RMF Playbook, Govern 6, third-party supply chain. https://airc.nist.gov/airmf-resources/playbook/govern/
4. FTC, January 2024, AI companies' privacy and confidentiality promises, customer data and undisclosed model training. This is US-specific regulatory context, not a claim that US law applies worldwide. https://search.ftc.gov/policy/advocacy-research/tech-at-ftc/2024/01/ai-companies-uphold-your-privacy-confidentiality-commitments
5. OWASP GenAI Security Project, Q3 2026 incident roundup, tool misuse, privilege abuse and supply-chain risks. https://genai.owasp.org/2026/10/08/genai-and-agentic-ai-exploit-roundup-q3-2026/
6. All supplier volumes, time savings, fees, costs and benefits in the narration are fictional and labeled illustrative. No vendor, bank, or real company is alleged to have produced those numbers.
7. Seven-gate decision framework, examples and script are original PrismBay AI editorial material, not official requirements from the cited organizations.
