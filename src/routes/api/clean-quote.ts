import { createHash } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import liveQuoteConfig from "../../../config/clean-live-quote.json";
import { createQuoteService } from "../../../services/physical-orders/shipping-quote.mjs";

const requestSchema = z.object({
  productSlug: z.literal("garment-steamer"),
  zip: z.string().trim().regex(/^\d{5}$/),
}).strict();

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, max-age=0",
};

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function publicFailure(status: number) {
  if (status === 400) return reply({ success: false, error: "Enter a valid 5-digit U.S. ZIP code." }, 400);
  if (status === 409) return reply({ success: false, error: "This item is not available for that ZIP code right now. Try another ZIP or contact support." }, 409);
  return reply({ success: false, error: "Live availability checking is temporarily unavailable. Please try again." }, 503);
}

export const Route = createFileRoute("/api/clean-quote")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return publicFailure(400);
        }

        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) return publicFailure(400);
        if (!liveQuoteConfig.enabled || liveQuoteConfig.rules.automaticSupplierOrdering !== false) return publicFailure(503);

        const apiKey = String(process.env.CJ_API_KEY || "").trim();
        if (!apiKey) {
          console.error("clean_quote_cj_not_configured");
          return publicFailure(503);
        }

        const quoteSecret = createHash("sha256")
          .update(`prismbay-clean-live-quote-v1:${apiKey}`)
          .digest("hex");

        const quoteCatalog = {
          products: [
            {
              sku: liveQuoteConfig.sku,
              retailUsd: liveQuoteConfig.retailUsd,
              feeRatePct: liveQuoteConfig.feeRatePct,
              returnReservePct: liveQuoteConfig.returnReservePct,
              stripePaymentUrl: liveQuoteConfig.stripePaymentUrl,
              routes: liveQuoteConfig.routes.map((route) => ({
                routeId: route.routeId,
                cjVariantId: route.cjVariantId,
                supplierCostUsd: route.supplierCostUsd,
                originCountryCode: route.originCountryCode,
              })),
            },
          ],
        };

        try {
          const quoteService = createQuoteService({
            env: {
              ...process.env,
              CJ_API_KEY: apiKey,
              QUOTE_SIGNING_SECRET: quoteSecret,
              QUOTE_TTL_SECONDS: "300",
              CJ_QUOTE_PRODUCTS_JSON: JSON.stringify(quoteCatalog),
            },
          });

          const quote = await quoteService.quote({
            sku: liveQuoteConfig.sku,
            zip: parsed.data.zip,
            quantity: liveQuoteConfig.rules.quantity,
          });

          if (!quote?.ok) return publicFailure(Number(quote?.status) || 503);
          if (quote.checkoutAllowed !== true || typeof quote.quoteToken !== "string") return publicFailure(409);

          const authorization = await quoteService.authorizeCheckout({
            quoteToken: quote.quoteToken,
            zip: parsed.data.zip,
          });

          if (!authorization?.ok || authorization.checkoutAllowed !== true || typeof authorization.paymentUrl !== "string") {
            return publicFailure(Number(authorization?.status) || 409);
          }

          return reply({
            success: true,
            productSlug: liveQuoteConfig.sku,
            productName: liveQuoteConfig.displayName,
            priceUsd: liveQuoteConfig.retailUsd,
            zip: parsed.data.zip,
            stockVerified: authorization.stockRevalidatedAtCheckout === true,
            destinationShippingVerified: authorization.shippingRevalidatedAtCheckout === true,
            economicsVerified: authorization.economicsRevalidatedAtCheckout === true,
            estimatedDelivery: quote.shipping?.aging || null,
            checkoutUrl: authorization.paymentUrl,
            supplierOrderingEnabled: false,
          });
        } catch {
          console.error("clean_quote_upstream_failed");
          return publicFailure(503);
        }
      },
    },
  },
});
