# PrismBay AI | PB-GOV-023 | Shadow AI: A Five-Control System for Real Businesses

Status: RESEARCHED EDITORIAL MASTER, NOT RENDERED OR PUBLISHED.
Target channel: UCw2hs85TzIpdKwJtG-BSxzQ (@PrismBayAI), exclusively.
Prepared: 2026-10-23. Target runtime: 9–11 minutes, with deliberate visual demonstration pauses.
Series: AI Operating Controls, episode 1.
Audience: founders, operations directors, finance leaders, IT/security owners, procurement managers.
Core promise: Replace an ineffective blanket ban with a documented, risk-tiered approval system that protects sensitive information while retaining useful AI workflows.
Source discipline: Original PrismBay framework informed by NIST AI RMF Generative AI Profile and OWASP LLM Top 10. Not a legal or compliance certification.

## Long-form narration master

### 0:00–0:50 | The real decision
Your team has already found ways to use AI. Someone is drafting customer replies. Someone else is summarizing supplier contracts. A third employee is pasting internal meeting notes into a chatbot. A company-wide email saying “Do not use AI” does not answer the operating question: Which work is acceptable, with which data, using which tools, under whose authority?

Today we will build a five-control system you can operate with a spreadsheet, an approved tool list, and named decision owners. No expensive platform is required for the basic process. I will show the approval matrix, a realistic example, the audit trail, and the point where an AI assistant becomes too risky to run without human approval.

On screen: three anonymous workflow cards move into a decision gate. Title: APPROVE / RESTRICT / STOP. No generic logo animation.

### 0:50–2:05 | Control 1: Classify the task before choosing the tool
Start with the work, not the model. Ask what output the employee needs and what information the system would receive.

Here is PrismBay's practical four-lane intake matrix. Green means public, low-risk material: drafting a conference agenda from information already published on your website. Amber means internal operational content with limited sensitivity: rewriting an internal procedure that contains no personal or restricted data. Red means sensitive data or a consequential recommendation: personnel records, customer financial details, unpublished commercial bids, legal strategy, or a model recommendation that influences an employment or credit decision. Black means prohibited or unapproved actions: entering credentials into prompts, exposing secrets, or allowing a tool to make payments or change bank details without an independently authorized control.

These colors are a proposed company policy design, not an official NIST or OWASP classification. Each organization must map them to its own contractual and legal obligations. An employee should be able to identify the lane before opening the AI tool.

On screen: four large colored lanes with original example cards. Never show real confidential data.

### 2:05–3:10 | Control 2: Approve the tool and its data boundary
A task may be appropriate while the chosen service is not. Record the product, workspace type, vendor, administrator, permitted users, retention settings, data handling terms, and whether information is used for training. Do not assume a personal account has the same controls as an organization-managed account. Check the actual agreement and settings.

Create a simple tool register with six columns: tool, business owner, approved use, permitted data lane, data retention or deletion arrangement, and next review date. Give each entry a status: approved, conditional, or blocked. A tool with no assigned owner stays conditional or blocked until the owner completes review.

If an employee proposes a new assistant, ask them to submit a one-paragraph use case and a sample of the data category. Do not ask them to email real confidential documents to the review team.

On screen: original animated tool register, with fictitious names and clearly labeled sample entries.

### 3:10–4:20 | Control 3: Limit permissions and require independent approval
The most dangerous AI mistake is not always an incorrect sentence. It is giving a model permission to perform a consequential action.

Consider a purchasing assistant. Reading a purchase request, finding the applicable policy, and drafting a recommendation are three different privileges from editing a supplier master record, changing banking details, or releasing funds. Separate those permissions technically. Give the assistant read access where possible, restrict writes, and keep approval authority with an authenticated human using an independent workflow.

OWASP's 2025 LLM risk categories include excessive agency, sensitive information disclosure, and prompt injection. These are reasons to design least-privilege access, not proof that a particular tool is unsafe. Treat material retrieved from emails, documents, and web pages as untrusted content, even when an AI agent presents it confidently.

On screen: permission diagram. LEFT: READ and DRAFT. RIGHT: CHANGE BANK DETAILS and RELEASE PAYMENT. Human approval gate between them.

### 4:20–5:30 | Control 4: Verify the output at the point of use
AI output is not a source of authority. Build a review checkpoint where a mistake would matter.

For a public marketing draft, the reviewer checks accuracy, tone, and intellectual-property risk. For a supplier comparison, the reviewer verifies quoted prices, terms, references, and calculations against original documents. For a safety, financial, or personnel decision, an accountable professional reviews the underlying evidence and follows the organization's formal decision process.

A useful rule is: the higher the impact, the stronger the evidence and sign-off. Require source links or document references for factual claims. Record exceptions and corrections. An impressive answer without traceable evidence does not pass the review.

For demonstration, suppose a fictional assistant compares three supplier bids. It recommends the cheapest quoted unit price. The human reviewer notices that the cheapest bid excludes freight and has a longer lead time. The assistant's output was helpful for organizing the comparison, but the purchase decision needed a total-cost calculation and a human owner.

On screen: original bid-comparison grid with hypothetical figures. A red circle moves from UNIT PRICE to TOTAL DELIVERED COST. Label: ILLUSTRATIVE EXAMPLE.

### 5:30–6:40 | Control 5: Log the decision and test for drift
The fifth control is evidence. For every approved workflow, record the owner, tool, use case, risk lane, permissions, reviewer, and date. Keep a short incident log: what failed, whether sensitive information was involved, what the organization did, and whether access was suspended.

Set a review interval appropriate to the risk. For example, a low-risk drafting workflow might receive a periodic sample review. A high-impact assistant might need pre-release tests, active monitoring, exception alerts, and a documented shutdown owner. The exact interval is a management decision, not a universal standard.

Ask three questions every review cycle. Did the tool perform its approved task? Did its access or data use change? Did human reviewers find new error patterns? If the answers raise concerns, pause the workflow and investigate. An approval granted six months ago is not permanent permission for a newly added feature.

On screen: event log with fictional entries and an animated PAUSE switch.

### 6:40–8:10 | Walkthrough: approve a supplier email assistant in 15 minutes
Here is a realistic intake meeting. The procurement manager wants an assistant to draft replies to suppliers asking about delivery status. First, classify the task. Public order-status wording is low risk, but real purchase-order records and contact details may raise the data lane. Second, confirm the organization-managed tool is approved for those fields. Third, permit read access to the minimum order fields and drafting access only. Do not grant authority to send messages automatically or alter supplier records.

Fourth, require a staff member to verify order numbers, delivery dates, and recipients before sending. Fifth, log the use case and check a sample of messages after launch.

The decision is conditional approval for draft-only use. If the proposed tool cannot meet the data requirements, the team should use sanitized test data or an approved alternative. If the business wants autonomous sending later, treat that as a new approval, not a minor setting change.

Notice the outcome: the company has a workable path to productivity without pretending every workflow carries the same risk.

On screen: a single original decision tree with five gates. Green check marks appear only after evidence is shown.

### 8:10–9:25 | The one-page policy
Put the entire operating system on one page. Every use case must have a named owner. Every input must have a data classification. Every tool must appear in an approved register. Every consequential action must pass an independent approval boundary. Every workflow must leave enough evidence for a reviewer to understand what happened.

The NIST AI Risk Management Framework and its Generative AI Profile support structured governance, measurement, and management of AI risk. OWASP identifies technical failure modes such as prompt injection and excessive agency. PrismBay's five controls translate those broad principles into a practical operating routine. They do not replace legal advice, security engineering, or industry-specific obligations.

Start with one workflow and one owner. Prove that the process works. Then expand carefully. A good AI policy does not ask employees to choose between productivity and accountability. It defines the conditions for both.

PrismBay AI helps founders, operators, and executives implement practical AI business systems. Subscribe for original workflow demonstrations, measurable AI economics, and operating controls.

On screen: final five-box checklist and channel promise. No stock montage.

## Three differentiated long-form title candidates and thumbnail concepts

A. Search-led: "Shadow AI at Work: The 5 Controls Every Business Needs"
Thumbnail: Single bright four-lane risk matrix, one unapproved AI tool card entering a red lane. Text: "WHO APPROVED THIS?"
Hypothesis: precise governance search intent attracts operational leaders.

B. Problem-led: "Your Employees Use AI. Your Policy Still Says No."
Thumbnail: split frame with a generic blocked sign and a simple green approved-workflow gate. Text: "BAN OR CONTROL?"
Hypothesis: contradiction and a concrete resolution improve click quality without fear-based deception.

C. Outcome-led: "Build an AI Use Policy in One Page (With Real Examples)"
Thumbnail: a single readable one-page five-control checklist, large approval stamp, minimal text: "1-PAGE POLICY".
Hypothesis: an actionable deliverable attracts high-intent viewers and supports completion rate.

Use native YouTube Studio A/B testing for eligible long-form upload, comparing distinct title/thumbnail pairs. Do not use this feature for Shorts.

## Derivative Short 1 | 42–55 seconds | The four lanes
Hook (first 1 second): "Your AI policy needs four lanes, not a blanket ban."
Narration: "Green: public, low-risk drafting. Amber: internal operational content. Red: sensitive records or high-impact decisions. Black: credentials, unauthorized payments, and prohibited access. Those colors are a sample company framework, not a legal standard. Every AI use case gets a lane before anyone chooses a tool. A public conference agenda is different from a supplier banking change. Different data, different permissions, different approval. PrismBay AI shows business teams how to turn AI risk into operating rules."
Visuals: original animated four-lane sorting board, no reuse of the long-form footage verbatim.
Title: "Stop Treating Every AI Task the Same"
Experiment: visual sorting hook vs narrative anecdote, test sequentially, never upload near-duplicate edits.

## Derivative Short 2 | 42–55 seconds | Draft is not approval
Hook: "An AI agent should not approve the payment it recommended."
Narration: "Picture a procurement agent. It reads three quotes and drafts a recommendation. Fine. Now someone gives it permission to change supplier bank details and release funds. That is a different risk. Separate read access from write access. Keep consequential approval with an authenticated person outside the AI workflow. Log the decision. An AI agent can speed up preparation without owning the final authorization. PrismBay AI builds practical AI operating systems for decision-makers."
Visuals: original animated permission diagram with two physically separated columns and a human checkpoint.
Title: "The AI Permission Mistake That Matters Most"
Experiment: consequence-first hook, measure engaged views and subscribers per 1,000 views.

## Derivative Short 3 | 45–60 seconds | The supplier example
Hook: "The cheapest AI-selected supplier may not be the cheapest supplier."
Narration: "A fictional AI assistant compares three bids and picks the lowest unit price. But the cheapest quote excludes freight. Another quote arrives sooner. A buyer checks total delivered cost, delivery time, and contract terms before approval. That is the difference between an AI draft and a business decision. Use AI to organize evidence. Require humans to validate consequential claims and sign off. This is an illustrative example, not a real supplier case. Follow PrismBay AI for original business workflows."
Visuals: original hypothetical bid grid, highlight unit price, then total delivered cost.
Title: "AI Picked the Cheapest Bid. Here's What It Missed."
Experiment: demonstration-first hook with tangible payoff.

## Growth experiment and publication gate

ID: PB-GOV-023. Hypothesis: A specific, implementable policy artifact will attract higher-intent viewers and subscribers than generic AI safety news.
Baseline: Refresh channel per-video performance before setting numerical thresholds; do not invent a baseline from 7 subscribers.
Long-form target: 9–11 min. Three distinct packaging pairs above. Primary KPI: watch-time share and qualified long-form minutes; secondary: subscribers per 1,000 views and meaningful comments. Shorts KPI: viewed-versus-swiped, engaged views, completion, and subscriber conversion where Studio provides them.
Publishing window: Use Metricool's channel-specific best-time signal only after checking scheduled inventory. Current provisional signal is 16:00 America/Guyana, subject to test.
Reviews: 6h, 24h, 72h, 7d after actual publication. SCALE when at least two meaningful engagement measures outperform a robust channel median with adequate samples. RETEST when hook/packaging weak but content response strong. MODIFY when retention falls at a specific segment. STOP when repeated results are weak or controls fail.
Rights: all diagrams and numerical examples must be original, hypothetical data labeled. Avoid mass-reused template footage. Narration and captions require manual QC before scheduling. Check exact target channel, metadata, existing posts and uploaded markers first. No paid ads.
No upload performed by this editorial commit.

## Source references checked 2026-10-23
- NIST, Artificial Intelligence Risk Management Framework: Generative AI Profile (NIST AI 600-1): https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence
- OWASP, Top 10 for LLM Applications 2025 (official PDF): https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf
- YouTube Partner Programme eligibility and terms: https://support.google.com/youtube/answer/72851

Editorial verification: All examples explicitly hypothetical; no statistics fabricated; no third-party footage or copied scripts; business framework is PrismBay's own, not presented as an official certification.
