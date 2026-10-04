# PrismBay Commerce Core Provenance

PrismBay's commerce-core module is original code that provides a small compatibility contract over the repository's existing catalog, payment, order and fulfillment controls.

## Architecture references

**Medusa**
- Repository: `medusajs/medusa`
- Boundary: MIT-licensed core only
- Enterprise Edition material is excluded
- Concepts referenced: products, variants, offers, orders and modular commerce primitives

**Saleor**
- Repository: `saleor/saleor`
- License: BSD-3-Clause
- Use: architecture reference only
- Concepts referenced: API-first commerce, large-catalog modeling, orders, payments and webhook-oriented extension patterns

No upstream source code is copied into this module.

## PrismBay remains authoritative

The existing `scripts/catalog-scale-gate.mjs` remains the source of truth for SALE_READY status. The core bridge calls that logic rather than inventing a second publishability system. Existing physical-order webhook ingestion and exact-destination checkout authorization also remain unchanged.

A candidate that lacks a verified supplier variant identity, destination freight, landed-cost evidence, margin approval, media rights, checkout infrastructure or fulfillment readiness remains non-publishable. The core bridge will not expose a checkout URL for such a product.

## Supplier-order boundary

`AUTOMATIC_SUPPLIER_ORDERING` is hard-coded false. Moving an order into `supplier_pending` requires explicit supplier-order authorization evidence. The core module itself never calls a supplier API or creates an order.
