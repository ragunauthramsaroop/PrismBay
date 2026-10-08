# Recruiter Outreach Automation Guardrails

This repository contains only the public-safe control policy for the executive recruiter outreach automation.

## Execution boundary

The live outreach runner operates outside this public repository. Recipient addresses, candidate CVs, message bodies, mailbox history, authentication credentials, SMTP passwords, app passwords, and private outreach ledgers must never be committed here.

## Operating policy

Each outreach run must:

1. Prioritize Saudi Arabia, the United Arab Emirates, and wider GCC executive-search firms relevant to senior leadership, external/corporate affairs, government relations, ESG/sustainability, strategic partnerships, mining, natural resources, energy transition, infrastructure, industrials, and executive operations.
2. Check prior outbound-mail history and any available private outreach ledger before sending.
3. Exclude any firm or domain already contacted.
4. Use only an email route explicitly published by the recruiter, firm, or another authoritative source. Never infer an address from a naming pattern.
5. Tailor the introduction to the firm's geography and sector coverage.
6. Attach the current approved Gulf executive CV from private storage only.
7. Keep the candidate's preferred personal reply identity in the message while never publishing that identity or credentials in this repository.
8. Send no more than 10 qualified new introductions per execution cycle.
9. Prefer fewer high-quality sends over weaker or duplicate outreach.
10. Record only confirmed delivery outcomes in the private execution environment.

## Public-repository privacy rule

No recruiter list, recipient email, CV, cover letter, personal phone number, personal email address, mailbox export, OAuth token, API key, SMTP secret, app password, or private delivery log belongs in this repository.

The companion GitHub Actions workflow is a guardrail/heartbeat only. It does not send recruiter email and is intentionally separated from PrismBay's commerce email delivery stack.
