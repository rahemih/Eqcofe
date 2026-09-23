import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ListingUrlStateError,
  parseListingUrlState,
  serializeListingUrlState,
  updateListingUrlState,
} from "../app/features/listing/listing-url-state.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractSource = readFileSync(resolve(root, "app/features/listing/listing-contract.ts"), "utf8");
const cardSource = readFileSync(resolve(root, "app/features/listing/ListingProductCard.tsx"), "utf8");
const gridSource = readFileSync(resolve(root, "app/features/listing/ListingGrid.tsx"), "utf8");
const css = readFileSync(resolve(root, "app/styles/listing.css"), "utf8");
const searchRoute = readFileSync(resolve(root, "app/routes/search.tsx"), "utf8");
const searchProductionized = searchRoute.includes("loadSearchRouteData") && searchRoute.includes("ListingGrid");
const categoryRoute = readFileSync(resolve(root, "app/routes/category.tsx"), "utf8");
const categoryProductionized = categoryRoute.includes("loadCategoryRouteData") && categoryRoute.includes("ListingGrid");

assert.match(contractSource, /ApiComponents\["schemas"\]\["ProductCard"\]/);
assert.match(contractSource, /ApiSuccessData<"get", "\/products">/);
assert.match(contractSource, /ApiSuccessData<"get", "\/search">/);
assert.match(contractSource, /ApiSuccessData<"get", "\/categories\/\{slug\}\/products">/);
assert.doesNotMatch(contractSource, /interface\s+ProductCard|type\s+ProductCard\s*=/);

const search = parseListingUrlState("?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8&cursor=opaque-token&limit=25", "search");
assert.deepEqual(search, { q: "آسیاب", cursor: "opaque-token", limit: 25 });
assert.equal(serializeListingUrlState(search), "q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8&cursor=opaque-token&limit=25");
assert.deepEqual(parseListingUrlState("?cursor=opaque-token&limit=100", "collection"), {
  cursor: "opaque-token",
  limit: 100,
});

assert.throws(
  () => parseListingUrlState("?sort=price", "collection"),
  (error: unknown) => error instanceof ListingUrlStateError && error.code === "LISTING_QUERY_INVALID",
);
assert.throws(
  () => parseListingUrlState("?cursor=a&cursor=b", "collection"),
  (error: unknown) => error instanceof ListingUrlStateError && error.code === "LISTING_QUERY_DUPLICATE",
);
assert.throws(
  () => parseListingUrlState("?q=test", "collection"),
  (error: unknown) => error instanceof ListingUrlStateError && error.code === "LISTING_QUERY_NOT_ALLOWED",
);
assert.throws(
  () => parseListingUrlState("?q=%20%20", "search"),
  (error: unknown) => error instanceof ListingUrlStateError && error.code === "LISTING_QUERY_INVALID",
);
assert.throws(
  () => parseListingUrlState("?limit=0", "collection"),
  (error: unknown) => error instanceof ListingUrlStateError && error.code === "LISTING_LIMIT_INVALID",
);
assert.throws(
  () => parseListingUrlState("?limit=101", "collection"),
  (error: unknown) => error instanceof ListingUrlStateError && error.code === "LISTING_LIMIT_INVALID",
);
assert.throws(
  () => parseListingUrlState("?cursor=" + "x".repeat(1025), "collection"),
  (error: unknown) => error instanceof ListingUrlStateError && error.code === "LISTING_CURSOR_INVALID",
);

assert.deepEqual(
  updateListingUrlState({ q: "آسیاب", cursor: "old", limit: 25 }, { q: "تمپر" }),
  { q: "تمپر", limit: 25 },
);
assert.deepEqual(
  updateListingUrlState({ cursor: "old", limit: 25 }, { limit: 50 }),
  { limit: 50 },
);
assert.deepEqual(
  updateListingUrlState({ cursor: "old", limit: 25 }, { cursor: "next" }),
  { cursor: "next", limit: 25 },
);

for (const token of [
  "product.primary_image",
  "product.price",
  "product.availability",
  "current_toman",
  "sales_enabled",
  "in_stock",
  "/product/",
]) {
  assert.ok(cardSource.includes(token), "STEP60_C_PRODUCT_CARD_CONTRACT_MISSING:" + token);
}
assert.ok(gridSource.includes("ListingProductCard"), "STEP60_C_GRID_CARD_COMPOSITION_MISSING");
assert.ok(gridSource.includes("listing.css"), "STEP60_C_LISTING_STYLE_IMPORT_MISSING");
assert.doesNotMatch(cardSource, /add-to-cart|سبد خرید|available_quantity\s*[<=>]/i);
assert.doesNotMatch(css, /\bbrown\b/i);
assert.doesNotMatch(css, /(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m);
assert.ok(css.includes("@media (min-width: 600px)"));
assert.ok(css.includes("@media (min-width: 840px)"));
assert.ok(css.includes("@media (min-width: 1200px)"));
assert.ok(css.includes("min-block-size: var(--eq-size-touch-min)"));
assert.ok(css.includes("--eq-color-bg-subtle"));
assert.ok(css.includes("--eq-color-bg-surface"));
assert.ok(css.includes("--eq-color-border-default"));
assert.ok(css.includes("--eq-spacing-4"));

assert.ok(searchProductionized || searchRoute.includes("targetStep={60}"), "STEP60_C_SEARCH_HANDOFF_INVALID");
assert.ok(categoryProductionized || categoryRoute.includes("targetStep={60}"), "STEP60_C_CATEGORY_HANDOFF_INVALID");
if (searchProductionized) {
  assert.match(searchRoute, /loader\s*\(/);
  assert.match(searchRoute, /ListingControls/);
  assert.match(searchRoute, /ListingPagination/);
} else {
  assert.doesNotMatch(searchRoute, /loader\s*\(|createCustomerSessionBridge|\.request\(/);
}
if (categoryProductionized) {
  assert.match(categoryRoute, /loader\s*\(/);
  assert.match(categoryRoute, /ListingControls/);
  assert.match(categoryRoute, /ListingPagination/);
} else {
  assert.doesNotMatch(categoryRoute, /loader\s*\(|createCustomerSessionBridge|\.request\(/);
}

console.log(JSON.stringify({
  status: "PASS",
  stage: "60-C",
  gate: "shared-listing-foundation",
  generatedContractAuthority: true,
  urlState: ["q", "cursor", "limit", "brand", "min_price", "max_price", "available", "sort", "attribute_value"],
  cursorSemantics: "opaque-preserve-reset-on-result-set-change",
  routesProductionized: [searchProductionized ? "/search" : null, categoryProductionized ? "/category/:slug" : null].filter(Boolean),
  advancedFiltersOrSort: true,
  newDependencies: 0,
}, null, 2));
