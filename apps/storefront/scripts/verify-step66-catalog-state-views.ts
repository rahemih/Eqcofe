import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(path, "utf8");
const [data, view, archive, stopSale, routes, sitemap, shellVerify, staticVerify, browserVerify, css, pkg] = await Promise.all([
  read("apps/storefront/app/features/content/catalog-state-data.server.ts"),
  read("apps/storefront/app/features/content/CatalogStateView.tsx"),
  read("apps/storefront/app/routes/archive.tsx"),
  read("apps/storefront/app/routes/stop-sale.tsx"),
  read("apps/storefront/app/routes.ts"),
  read("apps/storefront/app/routes/sitemap.ts"),
  read("apps/storefront/scripts/verify-shell.mjs"),
  read("apps/storefront/scripts/verify-quality-static.mjs"),
  read("apps/storefront/scripts/verify-quality-browser.mjs"),
  read("apps/storefront/app/styles/content.css"),
  read("apps/storefront/package.json"),
]);

assert.ok(data.includes('ApiSuccessData<"get", "/catalog/archive">'));
assert.ok(data.includes('ApiSuccessData<"get", "/catalog/stop-sale">'));
assert.ok(data.includes("MAX_CURSOR_LENGTH = 1024"));
assert.ok(data.includes("PAGE_SIZE = 20"));
assert.equal(data.includes("base64"), false, "STEP66_G_CURSOR_MUST_REMAIN_OPAQUE");

for (const forbidden of ["archive_reason", "inventory", "variants", "admin"]) {
  assert.equal(view.includes(forbidden), false, "STEP66_G_ARCHIVE_PRIVATE_FIELD:" + forbidden);
}
assert.ok(view.includes("آرشیوشده"));
assert.ok(view.includes("فروش متوقف است"));
assert.ok(view.includes("ناموجود بودن به‌تنهایی به معنی توقف فروش نیست"));
assert.equal(view.includes("availability.in_stock"), false, "STEP66_G_STOP_SALE_INVENTORY_INFERENCE");
assert.equal(view.includes("sales_enabled"), false, "STEP66_G_STOP_SALE_BROWSER_INFERENCE");
assert.ok(view.includes("تومان"));

for (const route of [archive, stopSale]) {
  assert.ok(route.includes('name: "robots", content: "noindex,follow"'));
  assert.ok(route.includes("CatalogStateView"));
}
assert.ok(routes.includes('route("archive", "./routes/archive.tsx")'));
assert.ok(routes.includes('route("stop-sale", "./routes/stop-sale.tsx")'));
assert.equal(sitemap.includes('"/archive"'), false);
assert.equal(sitemap.includes('"/stop-sale"'), false);

for (const source of [shellVerify, staticVerify, browserVerify]) {
  assert.ok(source.includes('"/archive"'), "STEP66_G_ARCHIVE_QUALITY_ROUTE_MISSING");
  assert.ok(source.includes('"/stop-sale"'), "STEP66_G_STOP_SALE_QUALITY_ROUTE_MISSING");
}

assert.ok(css.includes(".catalog-state-page"));
assert.ok(css.includes("min-block-size: var(--eq-size-touch-min)"));
assert.ok(css.includes("focus-visible"));
assert.equal(/\bbrown\b/i.test(css), false);
assert.equal(/(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css), false);

const packageJson = JSON.parse(pkg) as { scripts: Record<string, string> };
assert.equal(packageJson.scripts["catalog-state-views:verify"], "pnpm --dir ../.. exec tsx apps/storefront/scripts/verify-step66-catalog-state-views.ts");
const verifyScript = packageJson.scripts.verify;
if (typeof verifyScript !== "string") throw new Error("STEP66_G_VERIFY_CHAIN_MISSING");
assert.ok(verifyScript.includes("catalog-state-views:verify"));

console.log("STEP66_CATALOG_STATE_VIEWS_VERIFY_PASS");
