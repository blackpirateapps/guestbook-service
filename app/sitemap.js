import { DOC_PATHS } from "../src/docs/docsRoutes.js";

export default function sitemap() {
  const siteUrl = (
    process.env.SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "https://guestbook-service.vercel.app"
  ).replace(/\/+$/, "");

  const baseUrl = /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`;
  const routes = ["", ...DOC_PATHS];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1.0 : 0.7,
  }));
}
