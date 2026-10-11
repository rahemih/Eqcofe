import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(path, "utf8");

const [contract, data, view, route, detailRoute, css, pkg, merch, acceptance] = await Promise.all([
  read("apps/storefront/app/features/content/article-contract.ts"),
  read("apps/storefront/app/features/content/article-list-data.server.ts"),
  read("apps/storefront/app/features/content/ArticleListView.tsx"),
  read("apps/storefront/app/routes/articles.tsx"),
  read("apps/storefront/app/routes/article-detail.tsx"),
  read("apps/storefront/app/styles/content.css"),
  read("apps/storefront/package.json"),
  read("apps/storefront/scripts/verify-step59-merchandising.ts"),
  read("apps/storefront/scripts/verify-step59-acceptance.ts"),
]);

assert.ok(contract.includes('ApiSuccessData<"get", "/articles">'));
assert.ok(contract.includes('ArticleListResponse["items"][number]'));

assert.ok(data.includes("const ARTICLE_PAGE_SIZE = 12"));
assert.ok(data.includes("const MAX_CURSOR_LENGTH = 1024"));
assert.ok(data.includes("createCustomerSessionBridge"));
assert.ok(data.includes('client.request("get", "/articles"'));
assert.ok(data.includes("limit: ARTICLE_PAGE_SIZE"));
assert.ok(data.includes("value.length > MAX_CURSOR_LENGTH"));
assert.equal(data.includes("base64"), false, "STEP66_C_CURSOR_MUST_REMAIN_OPAQUE");
assert.equal(data.includes("published"), false, "STEP66_C_PUBLICATION_FILTER_MUST_REMAIN_BACKEND_OWNED");
assert.equal(data.includes("localStorage"), false);
assert.equal(data.includes("sessionStorage"), false);

assert.ok(view.includes("مقالات و راهنمای خرید تجهیزات قهوه"));
assert.ok(view.includes("فقط محتوایی نمایش داده می‌شود"));
assert.ok(view.includes('role="alert"'));
assert.ok(view.includes('rel="next"'));
assert.ok(view.includes("/articles/"));
assert.equal(view.includes("draft"), false);
assert.equal(view.includes("admin"), false);

assert.ok(route.includes("loadArticleListRouteData"));
assert.ok(route.includes("ArticleListView"));
assert.ok(route.includes("appendCustomerSessionSetCookies"));
assert.equal(route.includes("RoutePlaceholder"), false);

assert.ok(detailRoute.includes("RoutePlaceholder"));
assert.ok(detailRoute.includes("targetStep={66}"));

assert.ok(css.includes("min-block-size: var(--eq-size-touch-min)"));
assert.ok(css.includes("min-inline-size: var(--eq-size-touch-min)"));
assert.ok(css.includes("focus-visible"));
assert.ok(css.includes("@media (min-width: 600px)"));
assert.ok(css.includes("@media (min-width: 840px)"));
assert.equal(/\bbrown\b/i.test(css), false, "STEP66_C_BROWN_FORBIDDEN");
assert.equal(
  /(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css),
  false,
  "STEP66_C_PHYSICAL_RTL_PROPERTY_FOUND",
);

const packageJson = JSON.parse(pkg) as { scripts: Record<string, string> };
assert.equal(
  packageJson.scripts["content-foundation:verify"],
  "pnpm --dir ../.. exec tsx apps/storefront/scripts/verify-step66-content-foundation.ts",
);
const verifyScript = packageJson.scripts.verify;
if (typeof verifyScript !== "string") {
  throw new Error("STEP66_C_STOREFRONT_VERIFY_CHAIN_MISSING");
}
assert.ok(verifyScript.includes("content-foundation:verify"));
for (const inherited of ["step59:acceptance", "step60:acceptance", "step61:acceptance", "step62:acceptance", "step63:acceptance", "step64:acceptance", "step65:acceptance", "api:verify", "auth:verify", "state:verify", "quality:static"]) {
  assert.ok(verifyScript.includes(inherited), "STEP66_C_INHERITED_GATE_MISSING:" + inherited);
}

assert.ok(merch.includes("articlesProductionized"));
assert.ok(merch.includes("loadArticleListRouteData"));
assert.ok(merch.includes("ArticleListView"));
assert.ok(acceptance.includes("articlesProductionized"));
assert.ok(acceptance.includes("STEP66_C_ARTICLES_PRODUCTION_HANDOFF_MISSING"));

console.log("STEP66_CONTENT_FOUNDATION_VERIFY_PASS");
