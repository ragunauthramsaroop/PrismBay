# PrismBay GitHub Daily Sales Brief

## Alternative to ChatGPT scheduled-task limits

GitHub Actions runs the daily briefing at 12:00 UTC (8:00 AM Guyana) through .github/workflows/prismbay-daily-sales-brief.yml. The existing repository pipeline does not use a ChatGPT scheduled-task slot. GitHub schedules are best effort, so runs may start later than the designated minute.

Every run checks the buyer assessment, the buyer guide hub, the digital store, the buyer-acquisition workflow and any verifiable live Stripe charge data. It creates or updates one GitHub issue named PrismBay Daily Sales Brief. Later reporting days add one comment. GitHub sends issue notifications according to the account owner's notification settings and subscriptions.

## Privacy rules

The PrismBay repository is public. The scheduled public issue therefore shows only categorical evidence of payments, site health and workflow status. It never includes amounts, Stripe charge IDs, customer identities or secrets.

Stripe reading is optional. Set a restricted live key with read-only charges permission as the repository Actions secret named PRISMBAY_STRIPE_REPORTING_KEY.

Use GitHub repository Settings > Secrets and variables > Actions > New repository secret. Never paste an API key in chat, commits, issues or the README. No key is created or stored by this change.

Without a valid restricted Stripe key, the report says NOT_CONNECTED and UNMEASURED, not zero. Failed, incomplete or denied API reads never produce a false revenue total. Only successful, paid, live charges count.

The private financial detail file is generated only in the temporary runner. This workflow does not commit, upload or expose the detailed report. Exact private payment amounts remain available in your Stripe account.

## First-day verification

After merge, the push event triggers the workflow. Review the Actions run and the PrismBay Daily Sales Brief issue. Subscribe to the issue to receive daily comments as notifications. The cron schedule continues each day without another ChatGPT task slot.

## Remaining commercial gates

This is reporting, not sales acquisition. It never places orders, spends on advertising, sends prospecting messages or verifies digital file delivery. Secure order-specific entitlements and actual buyer traffic still require separate work.
