import type { ApiSuccessData } from "../platform/api/contract.js";
import { createApiClient } from "../platform/api/request.js";
import { readServerApiConfig } from "../platform/config/api.server.js";

type SitemapResponse = NonNullable<ApiSuccessData<"get", "/content/sitemap/articles">>;
const SITE_ORIGIN = "https://eqcofe.com";
const MAX_PAGES = 10;
const PAGE_SIZE = 1000;

export async function loader() {
  const client = createApiClient(readServerApiConfig());
  const items: SitemapResponse["items"] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await client.request("get", "/content/sitemap/articles", {
      query: {
        limit: PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      },
    });
    items.push(...response.data.items);
    cursor = response.data.next_cursor;
    if (!cursor) break;
  }

  if (cursor) {
    return new Response("Sitemap capacity exceeded", { status: 503 });
  }

  const staticUrls = ["/", "/articles", "/about", "/faq", "/policies/terms", "/policies/returns-warranty"];
  const urls = [
    ...staticUrls.map((path) => ({ loc: SITE_ORIGIN + path, lastmod: null })),
    ...items.map((item) => ({ loc: item.loc, lastmod: item.lastmod })),
  ];

  return new Response(renderSitemap(urls), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

function renderSitemap(items: Array<{ loc: string; lastmod: string | null }>) {
  const body = items.map((item) =>
    `  <url><loc>${escapeXml(item.loc)}</loc>${item.lastmod ? `<lastmod>${escapeXml(item.lastmod)}</lastmod>` : ""}</url>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[char] ?? char);
}
