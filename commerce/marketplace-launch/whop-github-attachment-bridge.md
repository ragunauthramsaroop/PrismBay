# Whop Files bridge: verified limits and recovery

Target Whop business: `biz_WHz0YQ6YMckpMO`. Existing paid product: `PrismBay Quote, Margin & Cash Studio`, USD 19 one time, **Hidden**. Separate free product: `PrismBay Clean`.

## What already works

- Whop company-scoped key `WHOP_COMPANY_API_KEY` and variable `WHOP_COMPANY_ID` are present in GitHub Actions. The original key is read-only.
- Read-only Whop product, price and checkout metadata pass.
- Whop company API currently exposes a private Content experience associated with the paid product and a public Forums experience. The paid product has NO official Files experience in the account-scoped GET /experiences results, although the Whop dashboard's Files app previously showed an uploaded buyer ZIP and a Product-gated permission selector.
- The Files app admin-screen preview is not a signed-out or real buyer authorization test. The Whop native GET /experiences result might omit app-specific installed Files instances. Avoid treating absence as a proven ZIP leak.
- The original buyer ZIP has been validated locally at SHA256 `d7b52cbe7628e21cbcae281e0217bf77e49ff4bf1d35f4e167ace339531fc715`. Do not upload its plaintext bytes to public GitHub.

## Installed bridge

Manual workflow: `.github/workflows/whop-files-attachment-bridge.yml`.
Script: `scripts/whop-files-attach-bridge.mjs`.
Tests: `scripts/whop-files-attach-bridge.test.mjs`.
GitHub Actions workflow URL: https://github.com/ragunauthramsaroop/PrismBay/actions/workflows/whop-files-attachment-bridge.yml

A push to main triggers a **dry-run** that reads products and experiences. A manual workflow with action `plan` does the same. The only mutating action, `attach`, uses Whop's official POST `/experiences/{id}/attach`. It requires:

1. Exactly one existing **private** Whop Files experience matching official app ID `app_5UWRrs7haZZeiQ`, already owned by Clean, with no access granted to the free product or other products.
2. Exact paid product verified by title and visibility Hidden, free product separately identified.
3. A **separate** limited-scope company API key stored as repository Actions secret `WHOP_FILES_ATTACH_API_KEY`, with only `experience:attach` and the smallest supporting read scopes if Whop requires them. The main read-only key stays unchanged.
4. Manual workflow inputs `action=attach`, `expected_experience_id=exp_...` matching the live existing Files instance, and `confirmation=ATTACH_EXISTING_PRIVATE_FILES_ONLY`.

It never creates another Files instance, publishes or advertises a product, changes payouts, uploads or downloads a buyer ZIP, charges any card, or claims real member delivery. It re-reads live Whop experience associations after a successful attach.

## Unresolved: Files instance not returned by native API

As of the previous live forensic run, GET /experiences did not return the official Files app. Therefore the current bridge should return `EXISTING_FILES_NOT_FOUND`, and safely perform **no write**. Increasing permissions alone will not resolve a missing experience record.

Whop support needs to establish whether the uploaded company Files view is a different app-level resource than Whop product experiences, and provide the supported method to attach **the exact existing Files instance containing the buyer ZIP** without duplicating or losing its contents. Submit this context and the app-store ID to support@whop.com or https://whop.com/support.

Also request confirmation of KYC and payout-destination readiness for the Whop business (not Stripe).

## Launch policy

Keep the USD 19 Whop product Hidden until independent signed-out and free-member denial checks, an authorized paid-buyer download of the correct ZIP and Whop payout readiness have been verified. A successful bridge attach alone is not enough.

Official Whop docs:
- https://docs.whop.com/api-reference/experiences/attach-experience
- https://docs.whop.com/api-reference/experiences/create-experience
- https://whop.com/blog/whop-files-app/
- https://docs.whop.com/get-help/whop-support
- Evidence: https://github.com/ragunauthramsaroop/PrismBay/issues/548
