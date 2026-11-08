# PrismForge Cloud (isolated development branch)

Production: https://prismforge-cloud.vercel.app/
Source branch: prismforge-cloud-platform (does not change PrismBay main)
Deployment: Vercel project prismforge-cloud under GuardianOS.

## Deployed
- Browser projects, templates, editor, live sandbox previews, design variants and snapshot history
- ZIP import and export, public GitHub import
- Cloud accounts using scrypt password hashes and signed HttpOnly session cookies
- Private project storage via Vercel Blob, account-scoped project save and retrieve
- Project invite roles (owner, editor and viewer) through cloud API
- Authenticated AI code generation and syntax-checked candidate responses, with optional parallel execution via /api/agent
- User/project-isolated persistent Linux Sandbox API at /api/run; runtime provisioned on demand
- Single-owner code-server environment for advanced terminal and Git workflows

## Important operational constraints
API function sources currently reside in the deployed Vercel API build. This branch synchronizes the current static frontend and documents their service contracts. Backend source and CI need mirroring into a dedicated PrismForge repository. This is NOT a completed full-Replit-parity release.

API routes:
- GET /api/cloud: service health; POST actions register, login, logout, me, list, load, save, remove, invite
- GET /api/agent: agent health; POST JSON {prompt, files, mode:"agent"|"parallel"} after session login
- GET /api/run: Linux health; POST JSON {id,action:"test"|"execute",command?,args?} after session login

Known gaps:
- Email verification, password reset, robust rate limiting and account deletion
- Verified AI model inference, authenticated end-to-end project testing
- Real-time operational transforms/CRDT collaboration
- GitHub bidirectional sync and automatic deploy pipeline
- One-click deployment from user projects
- Per-user managed SQL databases
- Automated billing, webhook signature validation, metering, audit and enterprise tenancy
- Long-term sandbox resource budget, abuse controls and security review

Keep all credentials server-side. Production Blob stores are private and must remain private.
