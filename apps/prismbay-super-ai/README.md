# PrismBay Super AI | v0.1
Isolated multi-provider AI workspace. No production integration, no external actions, no spend authorized. Source directory: https://github.com/open-free-llm-api/awesome-freellm-apis (catalog inspected 2026-11-25; provider claims not independently verified). No third-party source code copied.

## Run in an authorized development/cloud environment
Requires Node 22+; no npm dependencies. From this folder:
```sh
node --test router.test.mjs
node --check server.mjs
node --check ui.js
# Set environment variables using your cloud runtime's secret manager.
node server.mjs
```
The service binds loopback only, port 8787. Access via an authorized private HTTPS tunnel or authenticated reverse proxy, not an unauthenticated public port. Do not run on prohibited company/user computers or self-hosted runners. Set SUPER_AI_TOKEN to a random secret of 32+ characters. The UI requests this token; it is held in the current page only.

## Provider enrollment
Enable only after checking current model ID, regional access, data policy, free-only account/project and a provider-enforced zero-spend cap or no paid billing arrangement. Set the API key AND the matching FREE_ONLY flag to true. These flags are owner attestations, not remote billing verification. The application cannot guarantee no bill if credentials are linked to paid billing. Do not enable such credentials. No keys or environment values belong in Git.
- GROQ_API_KEY / GROQ_FREE_ONLY: https://console.groq.com/keys
- GEMINI_API_KEY / GEMINI_FREE_ONLY: https://aistudio.google.com/app/apikey
- NVIDIA_API_KEY / NVIDIA_FREE_ONLY: https://build.nvidia.com/settings/api-keys
- OPENROUTER_API_KEY / OPENROUTER_FREE_ONLY: https://openrouter.ai/settings/keys (explicit :free model)
- MISTRAL_API_KEY / MISTRAL_FREE_ONLY: https://console.mistral.ai/api-keys

## Functionality
Auto mode attempts up to three configured providers sequentially. Single mode never falls back. Council sends the conversation to two providers in parallel and synthesizes successful candidates using a third when available (otherwise the first). Maximum three calls per request. Independent models may share training data and errors; consensus does not verify facts. Five specialist prompt profiles. Browser session memory, export, provider attribution, attempt status and latency, credential-free diagnostics. No persistent history or live retrieval. Never submit confidential data. Provider outputs are rendered as text and never executed. No external tools or actions are enabled. One in-flight request per server and six request admissions per minute, in-memory only.

## Acceptance and limitations
Mock tests cover routing, consent, fail-closed behavior and council degradation. Live provider and billing tests require owner-approved credentials; model availability is not guaranteed. Before a public deployment add production identity/access controls, distributed quotas, monitoring, threat model review, data retention terms and load testing. This is an initial working architecture, not a foundation model, AGI, or verified performance improvement over any commercial model. No paid fallback. Existing PrismBay 9Router tooling remains unchanged; future integration requires separately verified free-route enforcement.
