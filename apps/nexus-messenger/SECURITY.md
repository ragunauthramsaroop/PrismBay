# Nexus Messenger security policy (engineering MVP)

## Security boundaries

- Client-server communication must use HTTPS for remote homeservers.
- Passwords are passed directly to the selected Matrix homeserver and are not saved by the application.
- Access tokens are stored in browser sessionStorage and cleared on sign-out. This is not equivalent to a hardened native secure enclave or HTTP-only session cookie.
- The Matrix SDK initializes Rust cryptography via WebAssembly and browser IndexedDB. Treat this as a per-origin, per-account crypto store and avoid concurrent live clients against the same store until a proper cross-tab lock is implemented.
- Newly created private rooms include Matrix room encryption state. This does not automatically verify participant identity or guarantee key recoverability.
- A public Matrix room or a room created without encryption remains unencrypted. The user interface explicitly identifies this.
- Rooms joined through another homeserver or bridge have the privacy characteristics of their underlying transport. Do not promise universal end-to-end protection for bridges.

## No production launch until

1. Implement device verification, cross-signing, secret storage, recovery keys, and tested encrypted backups.
2. Implement safe authenticated media transfers and attachment scanning, storage limits, and abuse protections.
3. Run browser and dependency vulnerability scans, a secrets scan, and a professional cryptographic integration audit.
4. Enforce and test a strong Content Security Policy, independent of user-controlled homeserver URLs.
5. Implement client-wide error telemetry only with explicit privacy consent and data minimization.
6. Implement account/session revocation and privacy-preserving multi-tab handling.
7. Perform load testing, accessibility testing, and independent penetration testing.
8. Document moderation, reporting, lawful request handling, privacy policy, and service terms.

## Vulnerability disclosure

Do not publish credentials or customer conversations in GitHub issues. Privately notify the repository owner via a suitable private channel until a security reporting address is established.
