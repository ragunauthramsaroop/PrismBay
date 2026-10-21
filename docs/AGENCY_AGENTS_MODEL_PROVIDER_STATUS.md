# Agency Agents free-model execution gate

## Verified live status (21 October 2026 UTC)
- The original scheduled Agency Agents implementation passed six deterministic tests. The production Claude Code call returned `unrecognized_model` for `oc/muse-spark-1.3-contributor-free` (GitHub Actions run 39536321070).
- A direct, read-only request through 9Router's documented local chat API returned HTTP 410. The workflow accurately failed (run 39537082140).
- A retry through the official OpenCode CLI using a listed free model was refused by its provider: "OpenCode's free tier can only be used from within OpenCode." No approved, working noninteractive access for that route was established (run 39537467357).
- Do not impersonate the OpenCode client or bypass provider checks. Never claim a model-driven review completed merely because the GitHub Actions job or deterministic worker ran.

## Existing automation kept operational
`.github/workflows/agency-agents-commerce-autopilot.yml` runs the six-role evidence dispatcher four times daily, produces a supplier-blocker brief and retains short-lived Actions artifacts. `.github/workflows/free-cloud-ops.yml` and `.github/workflows/cj-supplier-verification.yml` continue their existing product research and verification. No payments, procurement orders, new listings or publishing access is granted.

## Inference permission gate
GitHub repository Actions variable `PRISMBAY_AI_PROVIDER_READY` defaults to unset. Inference steps execute only after its value is explicitly set to `true`.

Before enabling, an authorized model provider must work from a fresh GitHub-hosted runner, permit noninteractive API or CLI use under its terms, and have a verified zero-spend route. Do not mark a provider ready based on `/models` listings alone. The current OpenCode free routes have *not* passed that test.

When inference is enabled, the workflow requires an actual model report. Missing output causes a failed production run instead of a misleading success. If the provider is unavailable, leave the variable unset: scheduled evidence analysis continues with explicit `model inference enabled: false` in the Actions summary.

## Owner authority
Supplier identity, exact variant inventory, buyer destination freight, delivery promises, use of media, permissioned channel connections, payout settings and checkout guards remain mandatory. Never infer sales, profits or fulfillment from AI-generated material. Paid-model subscriptions, payments and order execution require separate express authorization.
