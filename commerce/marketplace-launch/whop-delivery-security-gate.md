# PrismBay Quote Studio: Whop Release Security Gate

Last reviewed: 2026-11-01
Owner business: Clean (PrismBay Digital, operated by STUDYSMARTZ LLC)
Product: PrismBay Quote, Margin & Cash Studio, one-time USD 19.

## Verified by owner screenshots and uploaded archive

- The USD 19 Whop product exists and is **Hidden** in Products. Its revenue and active customers each display zero.
- The Whop **Files** app is installed under the Clean business.
- The Files app visibility was configured as **Product gated** with **only** PrismBay Quote, Margin & Cash Studio checked. The separate free PrismBay Clean product was not checked.
- A customer ZIP named `PrismBay_Whop_Buyer_File_v1_2.zip` is shown in the Whop Files list. The corresponding local buyer archive was independently inspected and passed ZIP integrity validation. SHA-256: `d7b52cbe7628e21cbcae281e0217bf77e49ff4bf1d35f4e167ace339531fc715`.
- The user's **Preview as Public** selection still displayed the ZIP filename in the **admin session**. This screenshot alone is **not** proof that a real anonymous visitor can download the file. Treat external access as **not independently verified**.

## What GitHub automation can do now

`scripts/whop-public-access-audit.mjs` performs a **read-only anonymous HTTP range request** to a private-configured Whop file link and classifies the result:

- `EXPOSED`: reachable ZIP bytes or unequivocal ZIP download headers; CI fails and commercial launch remains blocked.
- `ANONYMOUS_DENIED`: explicit HTTP 401/403 or redirection to a Whop login path. **This establishes denial for only the tested URL**, not general protection or buyer fulfillment.
- `INCONCLUSIVE`: HTTP 200 HTML, external redirects or unexpected response. Does not approve launch.
- `NOT_FOUND`: URL absent or expired, not proof of protection.
- `NOT_CONFIGURED`: no test link available. Does not approve launch.
- `ERROR`: blocked request, invalid URL or network failure. Does not approve launch.

The audit never follows third-party redirects, never uses Whop session cookies, never downloads the full ZIP, never prints file links, and never approves release. It rejects non-Whop initial hosts to avoid unintended network requests. The existing Digital Revenue CI runs its offline tests on PR and main updates. A live anonymous probe runs on merged main only when a *secret* named `PRISMBAY_WHOP_ANON_FILE_URL` has been configured by an authorized owner. The URL must identify an actual Whop download endpoint rather than the generic app page. Its value is **not** stored in public GitHub code, variables, issues or logs.

## Checks still required before release

- [ ] Whop external visitor denial at the exact file download endpoint, verified separately from the admin preview.
- [ ] Whop authorized **real customer** can download the correct ZIP after a successful paid transaction. Preview-as-product is not a substitute for genuine entitlement.
- [ ] A free PrismBay Clean member is denied the ZIP.
- [ ] Whop merchant identity, USD 19 checkout, payout route, support and refund terms are verified against the actual seller dashboard.
- [ ] Product cover, FAQ, license and buyer instructions have been reviewed in the Whop listing.
- [ ] Only after all checks pass: make the listing public, configure affiliate commission, verify Discover eligibility and track non-test sales.

Do not publish a *direct public ZIP link* or place the paid archive in the repository. Do not add Whop access tokens to markdown, comments, artifacts or source. Existing Stripe/Cashflow products are unaffected. Even if the anonymous probe returns `ANONYMOUS_DENIED`, the release remains blocked without paid-buyer evidence and payout readiness.

## Limits

GitHub has no Whop session or company API credential in the connected chat. No Whop-specific connector is connected. Therefore the GitHub code cannot inspect private Whop Files settings, impersonate a buyer or flip Whop's product visibility. The site needs an explicitly authorized Whop connection before any such platform mutations. This gate intentionally stops short of claiming an end-to-end launch.

Official Whop Files setup: https://whop.com/blog/whop-files-app/
Whop API authentication reference: https://docs.whop.com/llms.txt
Release issue: https://github.com/ragunauthramsaroop/PrismBay/issues/548
