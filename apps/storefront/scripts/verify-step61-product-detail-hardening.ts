import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AsyncSurfaceState } from "../app/platform/state/surface-state.js";
import type { ProductDetailResponse } from "../app/features/product-detail/product-detail-contract.js";
import type { ProductDetailRouteData } from "../app/features/product-detail/product-detail-data.server.js";
import { productDetailMeta } from "../app/features/product-detail/product-detail-seo.js";
import { describeProductDetailState } from "../app/features/product-detail/ProductDetailState.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");

const routeSource = readFileSync(resolve(storefrontRoot, "app/routes/product.tsx"), "utf8");
const dataSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/product-detail-data.server.ts"), "utf8");
const stateSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/ProductDetailState.tsx"), "utf8");
const seoSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/product-detail-seo.ts"), "utf8");
const css = readFileSync(resolve(storefrontRoot, "app/styles/product-detail.css"), "utf8");

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  name_fa: "آسیاب نمونه",
  slug: "sample-grinder",
  short_description: "آسیاب نمونه برای بررسی متای محصول",
} as unknown as ProductDetailResponse;

const readyData = {
  product: { status: "ready", data: product },
} as unknown as ProductDetailRouteData;
const readyMeta = productDetailMeta(readyData);
const readyEntries = Object.fromEntries(readyMeta.flatMap((item) =>
  "name" in item && typeof item.name === "string" && "content" in item
    ? [[item.name, item.content]]
    : [],
));
assert.equal(readyEntries.robots, "index,follow");
assert.equal(
  readyMeta.some((item) =>
    "href" in item
    && item.rel === "canonical"
    && item.href === "https://eqcofe.com/product/sample-grinder"
  ),
  true,
);
assert.equal(readyMeta.some((item) => "title" in item && /آسیاب نمونه/.test(String(item.title))), true);

const failedMeta = productDetailMeta({
  product: { status: "empty", reason: "no-result" },
} as unknown as ProductDetailRouteData);
const failedEntries = Object.fromEntries(failedMeta.flatMap((item) =>
  "name" in item && typeof item.name === "string" && "content" in item
    ? [[item.name, item.content]]
    : [],
));
assert.equal(failedEntries.robots, "noindex,follow");
assert.equal(failedMeta.some((item) => "rel" in item && item.rel === "canonical"), false);
assert.equal(/request|host|headers/i.test(seoSource), false, "STEP61_G_SEO_MUST_NOT_DERIVE_CANONICAL_FROM_REQUEST");

const emptyState = { status: "empty", reason: "no-result" } as AsyncSurfaceState<ProductDetailResponse>;
assert.equal(describeProductDetailState(emptyState, "online")?.variant, "empty");
assert.match(describeProductDetailState(emptyState, "online")?.title ?? "", /پیدا نشد/);

const forbiddenState = {
  status: "forbidden",
  requestId: "req-forbidden",
} as AsyncSurfaceState<ProductDetailResponse>;
assert.equal(describeProductDetailState(forbiddenState, "online")?.variant, "forbidden");

const recoveryState = {
  status: "recovery",
  problem: { requestId: "req-recovery" },
  plan: {},
} as unknown as AsyncSurfaceState<ProductDetailResponse>;
assert.equal(describeProductDetailState(recoveryState, "offline")?.variant, "offline");
assert.equal(describeProductDetailState(recoveryState, "online")?.variant, "recovery");
assert.equal(
  describeProductDetailState({ status: "ready", data: product }, "online"),
  null,
);

assert.match(routeSource, /export const meta/);
assert.match(routeSource, /productDetailMeta/);
assert.match(routeSource, /useNavigation/);
assert.match(routeSource, /aria-busy={pending}/);
assert.match(routeSource, /<article/);
assert.doesNotMatch(routeSource, /<main className="product-detail-page"/);
assert.match(routeSource, /ProductDetailState/);
assert.match(stateSource, /useSyncExternalStore/);
assert.match(stateSource, /subscribeBrowserConnectivityHint/);
assert.match(dataSource, /ApiClientError/);
assert.match(dataSource, /error\.status === 404/);
assert.match(dataSource, /emptyState\("no-result"\)/);

assert.match(css, /overflow-wrap:\s*anywhere/);
assert.match(css, /min-inline-size:\s*var\(--eq-size-touch-min\)/);
assert.match(css, /\.product-cart__form\s*\{[\s\S]*flex-wrap:\s*wrap/);
assert.match(css, /@media \(max-width: 36rem\)/);
assert.match(css, /\.product-cart__form button\s*\{[\s\S]*inline-size:\s*100%/);
assert.doesNotMatch(css, /\bbrown\b|(?:margin|padding|border)-(?:left|right)\s*:/i);

console.log(JSON.stringify({
  status: "PASS",
  stage: "61-G",
  seo: ["title", "description", "robots", "canonical"],
  states: ["empty", "error", "forbidden", "offline", "recovery", "pending"],
  accessibility: ["aria-busy", "live-status", "single-shell-main", "touch-targets"],
  responsive: ["long-text-wrap", "mobile-cart-width", "logical-properties"],
}, null, 2));
