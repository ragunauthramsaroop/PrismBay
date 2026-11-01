# PrismBay Cashflow Cloud: local CSV import

Status: **review-ready code, not deployed**. This module is for the existing Floot Cashflow Cloud pilot at https://prismbay-clean-global.floot.app/cloud. It does not create another website, subscription product, customer database, or payment system.

## Customer problem

Small service businesses often already have an invoice spreadsheet. Re-entering 50 to 500 invoices by hand makes trying a new receivables tool costly. The existing free browser pilot exports CSV but does not yet import CSV. This increment adds a client-side validation and preview engine so users will be able to bring their own existing invoices into the same local workspace.

The Intuit QuickBooks 2026 Small Business Late Payments Report states 59% of surveyed businesses have invoices overdue by 30 days or more and that businesses with unpaid invoices are owed USD 17,700 on average. The report combines U.S. survey sources, so do not represent the figures as worldwide prevalence or PrismBay sales evidence. Source: https://quickbooks.intuit.com/r/small-business-data/small-business-late-payments-report-2026/

## Interface

Import: previewInvoiceImport(csvText, existingInvoices, maxRecords=500)

Return on success: {ok:true, records:[{invoiceNumber,client,amount,dueDate,status}], count, totalAmount, errors:[]}

Return on failure: {ok:false, records:[], count:0, totalAmount:0, errors:[...]}

The function has no side effects, no network calls and no storage access. The caller must display the count and value preview and request explicit user confirmation before adding records.

## Required CSV columns

Invoice, Client, Amount USD, Due date, Status

Common synonyms such as Invoice number, Customer, Invoice amount, Due and Payment status are accepted. Dates must be ISO YYYY-MM-DD, amounts are positive USD with at most two decimals, and status is open or paid. Import is all-or-nothing. Duplicates against existing invoice numbers or within the uploaded file are rejected without changing existing records. A maximum of 500 combined invoices and a 512 KB input limit apply. Unsafe formula-leading identifiers, malformed quotes, invalid dates and control characters are rejected.

## Integration checklist for the existing Floot app

1. Wait until the free Floot build quota resets. Do not open another paid project or change the current retail checkout.
2. Port invoice-import.mjs into the existing Floot project as a browser-side helper, retaining the tests. The live pilot's export headers match the required columns.
3. Add a CSV file picker to the existing /cloud workspace. Read file text in the browser. Show validation errors, count, total imported amount, and a preview of the first few invoice records. Do not upload file contents.
4. On explicit confirmation, add random IDs with crypto.randomUUID() and merge the validated records into the local personal workspace. Refuse import while in fictional example mode unless the user chooses a fresh personal workspace first.
5. Keep CSV export working, test round-trip export -> import and test on mobile. Verify no accidental upload, duplicate overwrite, partial import or data loss.
6. Publish the existing Floot project only after typecheck and tests pass. Recheck the live page and document release evidence in issue #544.

## Safe, atomic commit adapter

`invoice-import-commit.mjs` adds a second, explicit step after preview. The browser page must show the validated record count and total before the user presses an Import button. The adapter refuses import in fictional example mode or without `confirmed:true`, rechecks the original CSV against the latest invoice register, generates unique IDs, and returns one complete new array. Invalid files, duplicate invoice numbers, duplicate IDs or ID generation failures return `records:null`. No records change on failure.

```js
import { previewInvoiceImport } from './invoice-import.mjs';
import { commitInvoiceImport } from './invoice-import-commit.mjs';

const preview = previewInvoiceImport(csvText, records);
if (!preview.ok) {
  showErrors(preview.errors);
} else {
  showImportPreview(preview.count, preview.totalAmount, preview.records.slice(0, 5));
}

// Call only inside the user's explicit confirmation click handler:
const result = commitInvoiceImport(csvText, records, {
  personalWorkspace: true,
  confirmed: true,
});
if (result.ok) setRecords(result.records);
else showErrors(result.errors);
```

The example names `showErrors`, `showImportPreview`, `records` and `setRecords` are UI placeholders, not functions supplied by this module. In the existing Floot React page, hold the CSV text in local component state until the user confirms or cancels. Never persist the raw CSV to the server, expose its contents in logs or automatically import on file selection. Clear the pending preview after a successful import, cancellation or file change. When changing between example and personal mode, discard any pending import. Test export and reimport in a fresh workspace, reject duplicates when importing twice, and verify mobile layout.

## Privacy and billing boundary

The current browser pilot stores financial records only in that browser's local storage. There is no hosted user identity, server-side invoice database, automatic email delivery or live SaaS billing. Do not label the import helper a secure multi-tenant cloud product. A separate authenticated SaaS backend and per-tenant authorization remain prerequisites for recurring subscriptions.

## Verification

Run: node --test services/cashflow-cloud/invoice-import*.test.mjs

The test suite covers export compatibility, CSV quoting, header aliases, duplicates, formula injection, real dates, amount limits, malformed CSV, file and row caps, atomic failure and quoted-newline handling. A GitHub Actions pull-request check runs the same tests without accessing secrets or deploying anything.

Commercial next step: collect genuine opt-in feedback from 10 independent service businesses, focusing on whether CSV import, overdue visibility and follow-up drafts solve a recurring paid problem. Record actual signups and paid conversions only after verified backend evidence.