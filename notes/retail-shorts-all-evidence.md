# PrismBay all-product retail short evidence

The all-product video renderer is intentionally separate from supplier-readiness and promotion gates.

Current checkout prices were independently confirmed in live Stripe on 2026-10-04 for the five products added beyond the original four-product renderer:

- Cordless Pressure Washer: $69.95
- Mattress Vacuum: $39.95
- Self-Squeeze Mini Mop: $24.95
- Sink Drain Catcher 2-Pack: $12.95
- Portable Home Caddy: $24.95

The remaining four products already had verified current-price creative in the original retail short workflow.

No sale claim is rendered unless `config/retail-promotions.json` contains an active promotion that passes authorization, regular-price verification, margin verification, Stripe sale-price verification, exact price match and evidence-reference gates.

This evidence does not establish supplier stock, destination freight, delivery timing, margin or promotion eligibility. Those remain separate fail-closed gates.
