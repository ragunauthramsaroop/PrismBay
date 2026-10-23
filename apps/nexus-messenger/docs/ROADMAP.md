# Nexus Messenger delivery roadmap

## Phase 1: Functional browser messenger

- [x] Independent React application and Matrix SDK integration
- [x] Password sign-in to an existing homeserver
- [x] Real room synchronization, room list, message send and receive
- [x] Private encrypted room creation, invitation and join flows
- [x] Responsive interface and validation tests
- [ ] Validate against two real Matrix accounts and record results
- [ ] GitHub CI pass and hosted deployment

## Phase 2: Secure, recoverable communications

- [ ] Cross-signing, device verification, and encrypted key backup
- [ ] Secure, authenticated attachment uploads/downloads
- [ ] Verified multi-device synchronization
- [ ] Notifications and offline history cache
- [ ] Session lock coordination for multiple browser tabs
- [ ] Federation and user-blocking tests

## Phase 3: Calls and communities

- [ ] Element Call and LiveKit integration (compatible room call state)
- [ ] Channel and community management
- [ ] Roles, moderation, spam protections and reporting
- [ ] Pinned messages, reactions, threads, search, and retention controls

## Phase 4: Mobile and commercial readiness

- [ ] Evaluate Matrix Rust SDK based Android and iOS apps
- [ ] Accessibility and security audits
- [ ] Monitoring, backup restores, rate limiting and capacity budgets
- [ ] App store compliance and privacy disclosures
- [ ] Optional enterprise features under a separate commercial plan

## Acceptance checks

- Two independent Matrix accounts exchange messages in both directions.
- Both accounts receive updates without refreshing the page.
- Encrypted room messaging works, and ciphertext is visible on homeserver storage rather than plaintext content.
- A second device joins and decrypts after approved key verification and recovery setup.
- Disconnected connections recover without duplicated outgoing messages.
- Room joins, invitations, and leaves are verified against a test homeserver.
- All automated checks pass on GitHub Actions.

No deployment, audit or two-account integration test is claimed complete until independently confirmed.
