# Nexus Messenger

A standalone web messenger built with React, Vite, and the Apache-2.0 licensed [Matrix JavaScript SDK](https://github.com/matrix-org/matrix-js-sdk). It works with a compatible Matrix homeserver. Source originally prepared for the Nexus Network product family, with no edits to the existing live Nexus Network application.

## Implemented

- Password login to an existing Matrix account on an HTTPS homeserver (local HTTP supported for `localhost` testing).
- Session-scoped access tokens, encrypted sync initialization using Matrix Rust crypto, and live room synchronization.
- List, search, and open joined and invited Matrix rooms.
- Create private rooms with the standard Matrix Megolm encryption room state.
- Join rooms by ID or alias; accept room invitations; invite Matrix users; leave rooms.
- Send and receive real room messages, with local-echo support through the Matrix SDK, timestamps, and loading indicators.
- Responsive interface for phones and desktop. No fake messages, trackers, or analytics services.
- Automated unit tests for URL, user-ID, and message validation.

## Before running

You need an existing Matrix account. Nexus Messenger does not operate a homeserver yet. A compatible public or self-hosted server provides registration, identity, rooms, storage, and delivery. The client does not register users itself. Your chosen homeserver must permit browser requests from the deployment origin.

## Local development

Requires Node.js 22+ and internet access for npm package installation.

```bash
npm install
npm test
npm run typecheck
npm run dev
```

Open `http://localhost:5173`. Enter your homeserver, Matrix ID (e.g. `@alice:example.org`), and password.

To produce the deployable static application:

```bash
npm run build
npm run preview
```

## Docker

```bash
docker build -t nexus-messenger:dev .
docker run --rm -p 8080:8080 nexus-messenger:dev
```

Open `http://localhost:8080`. Production requires HTTPS and a compatible Matrix homeserver.

## Deploy

Host the built `dist/` directory behind HTTPS using any static host with SPA fallback. Cloudflare Pages, GitHub Pages with appropriate base URL handling, and other static hosts are possible. For Docker deployments, use the included Dockerfile. Login and message delivery require a separate Matrix homeserver.

For an independent homeserver, review [Synapse](https://github.com/element-hq/synapse) and [Matrix Docker Ansible Deploy](https://github.com/spantaleev/matrix-docker-ansible-deploy). Do not expose a trial homeserver publicly without TLS, registration safeguards, backups, media quotas, moderation, monitoring, and security review.

## Status and important limitations

This is an engineering MVP, not a production-audited private messenger. There is no cross-signing bootstrap, verified-device UX, key backup/recovery workflow, push service, media uploads, calls, registration, account recovery, abuse handling, or audited mobile build. Encrypted rooms without a completed key-recovery and verification workflow must not be represented as secure against all threats. Pre-existing unencrypted Matrix rooms remain unencrypted, and the UI labels them accordingly. See `SECURITY.md` and `docs/ROADMAP.md`.

Login tokens are kept in session storage for convenience, not in a server database. They are cleared on sign-out and when the browser tab's session ends. Browser storage remains exposed to malicious JavaScript in the page, so avoid third-party scripts, perform a dependency audit, and enforce a tested CSP before release.

## Source attribution

This application's code is independent and uses Matrix via its public SDK dependency. It does not copy Signal, Element, or Synapse source files. Review third-party notices, licenses, and dependencies before commercial distribution.

## GitHub automation

See `docs/GITHUB_IMPORT.md` for repository import and automatic CI/Dependabot configuration.

## Next-generation interactive prototype

Use the **Explore the new Nexus prototype** button on the login page, or navigate to `/#prototype` on the deployed site. This is a self-contained and mobile-responsive product demonstration with five sections:

- **Chats**: search and filter locally seeded conversations; create a conversation; send a local demo message; convert the conversation into a local follow-up task.
- **Flow**: add tasks, mark actions complete or incomplete, and track pending work by personal and work context.
- **Spaces**: create a demonstration community and join or leave example spaces.
- **Calls**: generate a unique link to Jitsi Meet. The live meeting is hosted by Jitsi, not by Nexus, and opens in a separate tab.
- **You**: switch dark/bright appearance, compact density, quiet/low-data preferences, export JSON demo data, or reset the local workspace.

Personal/Work modes separate local sample conversations and tasks. State is persisted in `localStorage` under `nexus-next-prototype-v1` and remains on the same browser. **Demo messages do not reach real users or the Matrix network.** Demo settings do not alter the Matrix client's actual cryptographic or notification policy.

The existing Matrix sign-in and authenticated chat application remain operational through the ordinary root route; entering/leaving prototype mode mounts/unmounts the Matrix client cleanly. This preview is intended for UX validation and testing before backend integration. It is not a security-audited messenger or a production mobile app. Do not share private information in the external Jitsi meeting unless you accept that provider's privacy and security terms.
