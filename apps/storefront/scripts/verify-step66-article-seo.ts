import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(path, "utf8");
const [data, seo, view, route, sitemap, robots, routes, css, pkg] = await Promise.all([
  read("apps/storefront/app/features/content/article-detail-data.server.ts"),
  read("apps/storefront/app/features/content/article-detail-seo.ts"),
  read("apps/storefront/app/features/content/ArticleDetailView.tsx"),
  read("apps/storefront/app/routes/article-detail.tsx"),
  read("apps/storefront/app/routes/sitemap.ts"),
  read("apps/storefront/app/routes/robots.ts"),
  read("apps/storefront/app/routes.ts"),
  read("apps/storefront/app/styles/content.css"),
  read("apps/storefront/package.json"),
]);

assert.ok(data.includes('ApiSuccessData<"get", "/articles/{slug}">'));
assert.ok(data.includes('ApiSuccessData<"get", "/articles/{slug}/related">'));
assert.ok(data.includes('client.request("get", "/articles/{slug}"'));
assert.ok(data.includes('client.request("get", "/articles/{slug}/related"'));
assert.ok(data.includes("limit: 6"));
assert.equal(data.includes("localStorage"), false);

assert.ok(seo.includes("seo.canonical_url"));
assert.ok(seo.includes("seo.robots"));
assert.ok(seo.includes('"@type": "Article"'));
assert.ok(seo.includes("datePublished"));

assert.ok(view.includes('type="application/ld+json"'));
assert.ok(view.includes('replace(/</g, "\\\\u003c")'));
assert.equal(view.includes("dangerouslySetInnerHTML"), false);
assert.ok(view.includes("article.body"));
assert.ok(view.includes("مقاله‌های مرتبط"));

assert.ok(route.includes("loadArticleDetailRouteData"));
assert.ok(route.includes("articleDetailMeta"));
assert.equal(route.includes("RoutePlaceholder"), false);

assert.ok(sitemap.includes('ApiSuccessData<"get", "/content/sitemap/articles">'));
assert.ok(sitemap.includes("MAX_PAGES = 10"));
assert.ok(sitemap.includes("PAGE_SIZE = 1000"));
assert.ok(sitemap.includes("application/xml"));
assert.ok(sitemap.includes("Sitemap capacity exceeded"));
assert.ok(robots.includes("Sitemap:"));
assert.ok(routes.includes('route("sitemap.xml", "./routes/sitemap.ts")'));
assert.ok(routes.includes('route("robots.txt", "./routes/robots.ts")'));

assert.equal(/\bbrown\b/i.test(css), false);
assert.equal(/(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css), false);

const packageJson = JSON.parse(pkg) as { scripts: Record<string, string> };
assert.equal(packageJson.scripts["article-seo:verify"], "pnpm --dir ../.. exec tsx apps/storefront/scripts/verify-step66-article-seo.ts");
const verifyScript = packageJson.scripts.verify;
if (typeof verifyScript !== "string") throw new Error("STEP66_D_VERIFY_CHAIN_MISSING");
assert.ok(verifyScript.includes("article-seo:verify"));

console.log("STEP66_ARTICLE_SEO_VERIFY_PASS");
