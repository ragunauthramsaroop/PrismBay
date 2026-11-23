# Cashflow Cloud receivables action queue

Status: source prepared for review and integration. NOT LIVE in the public browser pilot.

This is a focused, local-only increment for the existing PrismBay Cloud pilot at https://prismbay-clean-global.floot.app/cloud. It adds practical receivables management value beyond basic invoice entry.

## What customers gain

- A current/1–7/8–30/31–60/61+ day receivables aging summary, with invoice counts and USD balances.
- A ranked manual follow-up queue showing overdue, due-today and upcoming invoices.
- A hold list respecting do-not-contact, promised payment dates, snoozes, recent follow-ups and future due dates.
- Editable invoice-specific email drafts, without automatic delivery or access to the user's contacts.

## API

`buildReceivablesQueue(invoices, today, options)` returns `{summary,queue,holds}`. Pass the user's local calendar date as `YYYY-MM-DD`, never a UTC date derived from server time. Existing invoice objects require id, invoiceNumber, client, amount, dueDate and status. Optional fields are doNotContact (boolean), promisedPaymentDate, lastFollowUpDate and nextFollowUpDate (ISO dates). All balances are USD.

`buildFollowUpDraft(invoice,today)` returns `{subject,body,sendAutomatically:false}`. It rejects paid invoices, do-not-contact records and header-control characters. Users review and send messages themselves.

This module does not call APIs, store records, send reminders or collect financial information.

## Integration into the existing Floot project

1. Wait for free-plan build-action reset at 2026-11-01 19:00 UTC. Do not create another Floot project or buy credits.
2. Finish the pending CSV import from PR #549, then port this helper into the same project and wire to the existing /cloud workspace.
3. Add an accessible aging table and follow-up queue, with clear labels for fictional demo data. Show a separate opt-in/manual control for contact holds and promised-payment dates. Do not silently infer permission to contact.
4. Store optional follow-up preferences in the existing local browser workspace only, without sending messages.
5. Add browser tests for demo/personal mode, paid/opt-out exclusions, overdue boundaries, mobile responsiveness, CSV export compatibility and no external network calls.
6. Typecheck and test, publish only the existing Floot project, and verify production behavior. No recurring billing until authenticated customer data isolation and merchant-of-record verification are complete.

## Verification

`node --test services/cashflow-cloud/receivables-queue.test.mjs`

No real customers, orders or paid subscriptions are asserted by this change. USD 19/month remains a pricing hypothesis.
