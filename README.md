# PrismBay AI

Practical, evidence-based AI operations education and implementation planning.

## Live worker & agent operations dashboard

**[Open PrismBay Mission Control](https://clean.prismbayai.com/ops/)** | [Accountability and escalation](https://github.com/ragunauthramsaroop/PrismBay/issues/413) | [GitHub Actions runs](https://github.com/ragunauthramsaroop/PrismBay/actions)

This read-only dashboard displays the five core revenue worker groups, latest GitHub run evidence, output artifacts, warning/probation status, recent workflow activity, and a limited commercial readiness summary. GitHub Actions publishes a privacy-filtered status snapshot after each accountability audit, and the page refreshes that snapshot every 60 seconds. **It separately polls recent production GitHub workflow runs approximately every two minutes** (subject to anonymous API limits), overlays their actual running/success/failure state on the worker cards and labels newly completed but unaudited runs as **proof pending**. The audit timestamp remains explicitly separate from the live GitHub check timestamp. Scheduled workflows may be delayed; the page is **near-live**, not a guaranteed continuously running system. It deliberately excludes customer personal data, API keys and internal supplier records. A successful run does **not** establish visits, orders, payments or profit.

Dashboard source: [`ops/worker-dashboard/`](ops/worker-dashboard/) · public status generator: [`scripts/public-ops-snapshot.mjs`](scripts/public-ops-snapshot.mjs).


## PrismBay Clean: shop the current offer

[View the Portable Garment Steamer, USD 29.95](https://clean.prismbayai.com/garment-steamer/?utm_source=github&utm_medium=readme&utm_campaign=clean_steamer) | [Read the buyer guide](https://clean.prismbayai.com/guides/portable-garment-steamer.html?utm_source=github&utm_medium=readme&utm_campaign=clean_buyer_guide) | [Shipping and returns](https://clean.prismbayai.com/shipping.html)

PrismBay Clean is the STUDYSMARTZ LLC physical-goods storefront serving eligible U.S. destinations. Enter your ZIP to request a supplier-stock and destination-shipping check. Secure checkout opens only after fresh stock, freight and commercial verification. If the automated service is unavailable, the product page offers a manual availability inquiry. No card is charged or order placed by the ZIP check.


## Free original resource

**[AI Vendor Risk Matrix: free 10-question worksheet](https://clean.prismbayai.com/scorecard.html)**

Compare AI suppliers by documented data-retention, model-training, export, security, human-approval and contract-exit terms rather than marketing claims. Includes a fictional worked example and a suggested 30-day decision plan.

[Try the private interactive assessment](https://clean.prismbayai.com/scorecard.html) · [Read the complete worksheet](https://clean.prismbayai.com/guide.html) · [Download editable Markdown](https://clean.prismbayai.com/risk-matrix.md) · [Watch the original 30-second video](https://clean.prismbayai.com/vendor-risk.mp4)

The new interactive worksheet generates a downloadable, self-reported evidence review without accounts, browser storage, tracking or payment. Its ten questions and report logic passed 10 offline tests on K1. It is a planning tool, not a vendor rating or automated approval.

**Always free:** no account, email address, payment or credit card required.

## Optional support

If the resource is useful, you can [support more original free AI education through our Stripe checkout](https://buy.stripe.com/aFa3cw0jweEMfCn2xs2400H). This is a voluntary **one-time $3–$100 USD** commercial contribution, processed by **Studysmartz LLC**. It is not a tax-deductible charitable donation and includes no premium report, software or consulting. The worksheet remains free regardless of payment.

## Live professional digital products

**Free, original guides with optional matching editable files:** [Stakeholder engagement planning](https://clean.prismbayai.com/stakeholder-engagement-plan-template.html?utm_source=github&utm_medium=readme&utm_campaign=stakeholder_guide) · [Monthly ESG reporting](https://clean.prismbayai.com/esg-monthly-reporting-template.html?utm_source=github&utm_medium=readme&utm_campaign=esg_guide) · [Board briefing and white paper writing](https://clean.prismbayai.com/board-briefing-white-paper-template.html?utm_source=github&utm_medium=readme&utm_campaign=whitepaper_guide). These substantive examples are free to use; each page accurately discloses an optional separate paid PDF/Excel/Word package and its verified existing checkout link.

[Browse four verified PrismBay executive toolkits](https://clean.prismbayai.com/toolkits.html): stakeholder mapping ($49), ESG and social performance ($99), executive white papers and board briefings ($79), or the complete three-system bundle ($179, saving $48 versus individual purchases). All offers use existing active Stripe payment links for the current PrismBay account. The available PDF guides, editable Excel workbooks, Word templates and license files were audited in the real ZIP archives; all four existing digital delivery endpoints returned valid ZIP packages. The checkout links are configured to redirect buyers to the corresponding package after payment.

These are paid **professional document systems**, not live AI applications or bespoke consulting. The original free worksheet and assessment remain free. The current digital fulfillment uses opaque, reusable access links, so order-bound delivery hardening and an actual paid end-to-end transaction test remain future safeguards. Follow the [published refund policy](https://www.prismbayai.com/refunds) and [contact support](https://www.prismbayai.com/contact) if a purchase cannot be downloaded.

## PrismBay Clean live commerce

[PrismBay Clean](https://clean.prismbayai.com/) is the separate physical-products storefront operated by STUDYSMARTZ LLC. The current public physical funnel is deliberately focused on the **Portable Garment Steamer, USD 29.95**.

- [Check the Portable Garment Steamer for a U.S. ZIP or request a manual quote](https://clean.prismbayai.com/garment-steamer/?utm_source=github&utm_medium=readme&utm_campaign=steamer_checkout)
- [Portable garment steamer buyer guide](https://clean.prismbayai.com/guides/portable-garment-steamer.html?utm_source=github&utm_medium=readme&utm_campaign=steamer_guide)
- [Garment steamer vs. iron](https://clean.prismbayai.com/guides/garment-steamer-vs-iron.html?utm_source=github&utm_medium=readme&utm_campaign=steamer_compare)
- [Travel garment steamer checklist](https://clean.prismbayai.com/guides/travel-garment-steamer-guide.html?utm_source=github&utm_medium=readme&utm_campaign=steamer_travel)
- [How to use a garment steamer safely](https://clean.prismbayai.com/guides/how-to-use-a-garment-steamer.html?utm_source=github&utm_medium=readme&utm_campaign=steamer_howto)

Physical-product promotion does **not** link directly to Stripe. The buyer first enters a 5-digit U.S. ZIP. When operational, the live quote service rechecks the mapped supplier variant, stock, destination freight and commercial safeguards. When unavailable, the product page offers a customer-initiated shipping inquiry instead. Stripe checkout is released only after a second successful live recheck. Supplier ordering is not automatic.

## Projects and channels

- [PrismBay AI](https://www.prismbayai.com/) provides business-system blueprint information. Blueprints are documentation, not working software.
- [PrismBay AI on YouTube](https://www.youtube.com/@PrismBayAI/videos) shares educational videos about AI operations and governance.
- [PrismBay Clean](https://clean.prismbayai.com/) is a **separate** home-products storefront with live buyer-specific shipping verification before physical checkout.

## Engineering and publishing

The `main` branch contains the application, tests, commerce tooling, Railway quote service and content-generation scripts. The `gh-pages` branch publishes the current `clean.prismbayai.com` storefront and its public buyer guides.

The guarded physical checkout service is implemented in `services/railway-clean-quote` and requires a healthy Railway deployment to enable live quotes. The public storefront does not expose the physical Stripe link before live buyer-specific verification passes.

These educational materials are not vendor ratings or legal, security, procurement or financial advice. Verify relevant facts and obtain appropriate expert review before consequential decisions.
