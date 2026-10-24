/**
 * GET /sitemap.xml
 * XML sitemap containing all static pages, products, bundles, comparisons, demos, and articles.
 */

import { createFileRoute } from "@tanstack/react-router";
import { PRODUCTS, BUNDLES } from "~/data/products";
import { ARTICLES, isPublished } from "~/data/articles";
import { COMPARISONS } from "~/data/comparisons";

const BASE_URL = "https://www.prismbayai.com";

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

function entry({
  loc,
  lastmod,
  changefreq,
  priority,
}: SitemapEntry): string {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const Route = createFileRoute("/sitemap/xml")({
  server: {
    handlers: {
      GET: async () => {
        // Fixed lastmod: content is not edited on a daily basis. Articles use
        // their real published date when available; everything else shares the
        // site launch date.
        const FIXED_LASTMOD = "2026-08-01";
        const urls: SitemapEntry[] = [];

        // Static pages
        const staticPages: Array<{ path: string; priority: string; changefreq: string }> = [
          { path: "/", priority: "1.0", changefreq: "daily" },
          { path: "/products", priority: "0.9", changefreq: "daily" },
          { path: "/pricing", priority: "0.8", changefreq: "weekly" },
          { path: "/how-it-works", priority: "0.7", changefreq: "monthly" },
          { path: "/trust", priority: "0.6", changefreq: "monthly" },
          { path: "/faq", priority: "0.6", changefreq: "monthly" },
          { path: "/about", priority: "0.5", changefreq: "monthly" },
          { path: "/contact", priority: "0.5", changefreq: "monthly" },
          { path: "/cookies", priority: "0.3", changefreq: "yearly" },
          { path: "/privacy", priority: "0.3", changefreq: "yearly" },
          { path: "/terms", priority: "0.3", changefreq: "yearly" },
          { path: "/refunds", priority: "0.3", changefreq: "yearly" },
        ];

        for (const page of staticPages) {
          urls.push({
            loc: `${BASE_URL}${page.path}`,
            lastmod: FIXED_LASTMOD,
            changefreq: page.changefreq,
            priority: page.priority,
          });
        }

        // Index pages
        const indexPages: Array<{ path: string; priority: string; changefreq: string }> = [
          { path: "/bundles", priority: "0.8", changefreq: "weekly" },
          { path: "/compare", priority: "0.7", changefreq: "weekly" },
          { path: "/demo", priority: "0.7", changefreq: "weekly" },
          { path: "/creative-studio", priority: "0.8", changefreq: "weekly" },
          { path: "/resources", priority: "0.8", changefreq: "daily" },
          { path: "/watch", priority: "0.8", changefreq: "weekly" },
        ];

        for (const page of indexPages) {
          urls.push({
            loc: `${BASE_URL}${page.path}`,
            lastmod: page.path === "/watch" ? "2026-09-24" : FIXED_LASTMOD,
            changefreq: page.changefreq,
            priority: page.priority,
          });
        }

        // Product pages
        for (const product of PRODUCTS) {
          urls.push({
            loc: `${BASE_URL}/products/${product.slug}`,
            lastmod: FIXED_LASTMOD,
            changefreq: "weekly",
            priority: "0.8",
          });
        }

        // Bundle pages
        for (const bundle of BUNDLES) {
          urls.push({
            loc: `${BASE_URL}/bundles/${bundle.slug}`,
            lastmod: FIXED_LASTMOD,
            changefreq: "weekly",
            priority: "0.7",
          });
        }

        // Comparison pages
        for (const comp of COMPARISONS) {
          urls.push({
            loc: `${BASE_URL}/compare/${comp.slug}`,
            lastmod: FIXED_LASTMOD,
            changefreq: "monthly",
            priority: "0.6",
          });
        }

        // Demo pages
        for (const product of PRODUCTS) {
          urls.push({
            loc: `${BASE_URL}/demo/${product.slug}`,
            lastmod: FIXED_LASTMOD,
            changefreq: "monthly",
            priority: "0.6",
          });
        }

        // Resource articles — use the article's real published date when set,
        // otherwise fall back to the fixed site date. Published dates are
        // stored as ISO 8601; the sitemap requires YYYY-MM-DD.
        const publishedArticles = ARTICLES.filter(isPublished);
        for (const article of publishedArticles) {
          urls.push({
            loc: `${BASE_URL}/resources/${article.slug}`,
            lastmod: article.published
              ? article.published.slice(0, 10)
              : FIXED_LASTMOD,
            changefreq: "monthly",
            priority: "0.6",
          });
        }

        const xmlEntries = urls.map(entry).join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
