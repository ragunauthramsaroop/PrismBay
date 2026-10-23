# PrismBay eBay Monitoring Route

This route operates outside ChatGPT task limits using GitHub Actions.

## Active cycles

- Autonomous eBay orchestrator: every 15 minutes
- CJ eBay support reply watcher: every 15 minutes
- Launch condition watcher: every 15 minutes, offset by 5 minutes

## Change detection

The launch condition watcher reads the published autonomous state and CJ ticket status from the gh-pages control plane. It creates a stable fingerprint from phase, blockers, CJ eBay authorization, final-review readiness, CJ ticket status, reply state, and next action.

Only meaningful fingerprint changes are escalated into GitHub issue #383.

## Safety gates

The automation does not approve account-owner consent, CAPTCHAs, security verification, banking or payout changes, supplier payment, or final marketplace publication.
