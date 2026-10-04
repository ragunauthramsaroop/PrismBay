# PrismBay Supplier Readiness and Approval Gate

This tranche advances the paid physical-order chain toward supplier-ready execution without placing a supplier order or authorizing spend.

## Purpose

A paid physical order is not enough evidence to order from a supplier. Supplier preparation must still prove the exact variant, current stock, destination freight, economics, listing rights and submission route. The supplier-readiness module converts that verified evidence into a de-identified supplier draft only when every required gate passes.

The approval layer then creates a short-lived, signed, draft-scoped commercial approval record. The approval record still carries `supplierSubmissionEnabled: false`. A later, separately reviewed submission adapter is required before any external supplier API can be called.

## Readiness evidence

`assessSupplierReadiness` requires:

- an existing paid physical Checkout order in `manual_fulfillment` or `processing`
- a stable evidence reference
- fresh supplier evidence
- exact order SKU and quantity matching
- a verified supplier variant for every order item
- verified inventory sufficient for the order quantity
- stock evidence no older than 30 minutes
- verified listing rights
- a U.S. buyer destination with exact ZIP-scoped freight evidence
- freight evidence no older than 10 minutes
- complete verified economics that still pass PrismBay's contribution and landed-cost thresholds
- verified supplier identity
- a verified supplier submission route

Any missing, stale, mismatched or commercially failing evidence blocks draft preparation.

## Privacy boundary

The supplier draft contains no customer email and does not store the buyer ZIP. Destination scope is represented by a SHA-256-derived destination hash. Full customer delivery details remain outside this readiness artifact and must only be resolved later inside an authorized supplier-submission boundary.

## Draft integrity

The draft gets a deterministic fingerprint over its order reference, exact supplier variants, destination hash, evidence reference and economics. The draft ID is derived from that fingerprint. Any mutation after approval invalidates the approval.

## Commercial approval

`issueSupplierApproval` requires:

- a valid immutable supplier draft
- an explicit approval reference
- an explicit approver reference
- a separate approval signing secret of at least 32 characters
- a bounded expiry of no more than 30 minutes

`verifySupplierApproval` checks the signature, draft scope, fingerprint and expiry. The resulting approval is evidence that a human/commercial approval occurred for that exact draft. It is deliberately not evidence that a supplier order was submitted.

## Current safety state

This tranche does not:

- call CJ or any other supplier ordering endpoint
- spend funds
- create or mutate Stripe objects
- infer stock or freight
- invent listing rights
- expose buyer email or ZIP in the draft
- mark an order fulfilled or shipped
- activate supplier submission

A future supplier-submission adapter must remain separately gated, idempotent, auditable and disabled until the owner explicitly authorizes the spending boundary and live supplier credentials/evidence are present.
