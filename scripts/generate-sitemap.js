import { mkdir, writeFile } from "node:fs/promises";
import { DOC_PATHS } from "../src/docs/docsRoutes.js";

const siteUrl = normalizeSiteUrl(
  process.env.SITE_URL ||
  process.env.PUBLIC_SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL ||
  "guestbook-service.vercel.app"
);

const routes = ["/", ...DOC_PATHS];
const today = new Date().toISOString().slice(0, 10);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url>
    <loc>${siteUrl}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${route === "/" ? "1.0" : "0.7"}</priority>
  </url>`).join("\n")}
</urlset>
`;

await mkdir("public", { recursive: true });
await writeFile("public/sitemap.xml", xml);
console.log(`Generated public/sitemap.xml with ${routes.length} routes for ${siteUrl}`);

function normalizeSiteUrl(value) {
  const raw = String(value || "").trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}
