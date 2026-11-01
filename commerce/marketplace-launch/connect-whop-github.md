# Connect Whop securely to PrismBay GitHub automation

The owner has already created the $19 **PrismBay Quote, Margin & Cash Studio** product under Whop business **Clean**, selected **Hidden**, installed **Files** as **Product gated** for that product, and uploaded the private ZIP.

GitHub read-only automation has been installed to reduce repeated manual navigation. Authentication remains a one-time requirement; Whop does not permit anonymous management of its seller accounts. An API key cannot be reconstructed from screenshots.

## One-time owner account authorization

1. Open https://whop.com/dashboard/developer/api-keys (or Whop business dashboard → **Developer** → **Company API keys**) and create a **company** key named `PrismBay GitHub Read Only`. Limit scopes to `access_pass:basic:read`, `plan:basic:read`, and `company:basic:read` for the company-scoped `/accounts/me` lookup. Do **not** grant payout write, transaction write, refund, or product mutation scopes. If the dashboard does not offer those exact scopes, consult the current Whop permissions before proceeding.
2. Open https://github.com/ragunauthramsaroop/PrismBay/settings/secrets/actions, choose **New repository secret**, name it `WHOP_COMPANY_API_KEY` and paste the company key directly. **Never paste the key in chat, a GitHub issue, a public file, or a workflow input.**
3. Whop business ID, if needed, starts with `biz_` and appears in the Whop dashboard URL. If `/accounts/me` is denied or the company is not resolved, store the non-secret ID as GitHub Actions **Variable** `WHOP_COMPANY_ID` at https://github.com/ragunauthramsaroop/PrismBay/settings/variables/actions.
4. Open the existing https://github.com/ragunauthramsaroop/PrismBay/actions/workflows/digital-revenue-ci.yml and select **Run workflow** on main. This performs read-only Whop metadata inspection and current CI. The workflow must never receive API keys as form inputs.

## What automation verifies

- Product name matches exactly once.
- The offer remains **Hidden** while the release is incomplete.
- Exactly one matching plan has **USD $19 one-time** pricing.
- Never approves release based on these metadata checks alone.
- Never reads or changes payouts, publishes products, uploads files, creates purchases, or downloads buyer archives.
- A follow-up separate signed-out file test and legitimate paid-member file entitlement confirmation remain mandatory before enabling public sales.
- All API operations in this initial adapter are **GET only**. Responses and secret values are not logged.

## Results

`VERIFIED_METADATA` means just the product's price, visibility and billing metadata match. On 2026-11-01 the first connected run returned 403 during broad account enumeration; the adapter was revised to use `/accounts/me` as a narrower company lookup. If the new request still receives 403, grant only `company:basic:read` on the company key, or provide `WHOP_COMPANY_ID` as a GitHub Actions variable to bypass this lookup. It is not a Whop release approval. `CONFIG_NEEDED` means the one-time authentication or business ID is missing. `REVIEW`, `AUTH_ERROR`, `API_ERROR` mean investigate and keep launch on hold.

The currently active public GitHub Pages preview is separate from the private buyer ZIP. Do not store the paid application archive in this public repository.

Official Whop documentation: https://whop.com/blog/how-to-use-the-whop-api/ and https://docs.whop.com/api-reference/products/list-products.
