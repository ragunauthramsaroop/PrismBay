# PrismBay Creative Studio Dashboard

This original interface was built from the owner's visual dashboard brief. The responsive studio is integrated at /creative-studio in the PrismBay TanStack React application.

## Customer functionality available without an API key

1. Dashboard: five creation tools, local-project totals, editable starter templates, creative assistant shortcuts and production quote pathways.
2. Video Ad Studio: coherent four-scene ad storyboard with narration and .txt download. This is a storyboard, not a completed playable video.
3. Presentation Studio: six-slide reviewable visual preview with .md slide-outline export. PowerPoint .pptx rendering is not connected.
4. Website Builder: a responsive standalone HTML document created by the local deterministic generator, rendered in a sandboxed iframe with a desktop/mobile toggle and download.
5. Campaign Planner: three headline options, editable caption concepts and seven-day launch checklist; Markdown export.
6. Brand Assets: original escaped-text SVG artwork with four selectable palettes and SVG download.
7. My Projects: create, open, duplicate, delete and persist up to 18 local browser drafts. Data never syncs with the user's account.
8. Automation Agents: a truthful operator view of five proposed AI roles. No active workers are claimed.
9. Marketplace: links to existing PrismBay professional digital product offers. Separate inquiry links open the customer's mail application.
10. Billing/Support: no fictitious balance, transactions or checkout links for custom production. Support email and local-data explanations.

All customer data remains in browser memory/localStorage, excluding explicit customer-initiated mail or external page navigation. Storage may be unavailable in restrictive/private browsers, so users should download original files. The HTML export applies context-specific XML/HTML escaping to untrusted text and is previewed in a sandboxed iframe. No third-party source code was copied.

## Upstream integrations for future controlled deployment

| Repo | Proposed capability | Today |
| --- | --- | --- |
| OpenHands/OpenHands | Secured work-agent control | Not connected |
| crewAIInc/crewAI | Agent orchestration with human review | Not connected |
| abi/screenshot-to-code | Screenshot to frontend design conversion | Not connected |
| icip-cas/PPTAgent | Editable PPTX output | Not connected |
| Anil-matcha/Open-AI-UGC | AI-generated video ad production through MUAPI | Not connected, paid calls require approval |

Source repositories report MIT licensing, but dependency rights, APIs, model usage terms and external rendering charges must be independently assessed before copying or operating any upstream components. The original OpenHands/agent-canvas repo is archived and points to OpenHands/OpenHands.

## Validation and production gates

GitHub CI workflow: .github/workflows/creative-studio-dashboard.yml

- Node 22: node --experimental-strip-types --test scripts/test-creative-offer.mjs scripts/test-creative-workspace.mjs
- Bun: bun install --no-save && bun run build
- Focused TypeScript: bunx tsc --project tsconfig.creative-studio.json --noEmit

The wider repository still reports pre-existing TypeScript errors in unrelated modules. The new Studio component tree receives its own strict TypeScript gate, while the entire application receives a complete production build.

The repository's package.json and bun.lock were already out of synchronization before this branch. The CI workflow uses bun install --no-save to avoid mutating the lockfile. This does not resolve the underlying drift; the lockfile should be aligned in a separate controlled maintenance task.

Publishing requires verification of desktop/mobile layout, download behavior, checkout/quote destinations and accessibility. The new studio does not deploy automatically, collect Stripe payments, email users, publish to social channels or provision AI services.

## Commercial pathways

- Free planning and export to attract qualified small-business customers.
- Separate established PrismBay professional toolkits through an existing storefront link.
- Written custom-production quotes after the owner approves scope, cost, rights, delivery and any required model API charges.

An existing Stripe link does not demonstrate a Studio-generated sale. Track only verified customer traffic, inquiries, approved quotes, captured payments, refunds and completed deliveries as commercial outcomes.
