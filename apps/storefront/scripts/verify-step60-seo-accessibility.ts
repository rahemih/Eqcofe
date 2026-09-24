import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { categoryMeta, searchMeta } from "../app/features/listing/listing-seo.js";
import type { CategoryRouteData } from "../app/features/category/category-data.server.js";
import type { SearchRouteData } from "../app/features/search/search-data.server.js";
import { describeCategoryState } from "../app/features/category/category-state.js";
import { describeSearchState } from "../app/features/search/search-state.js";
import { hasActiveListingFilters } from "../app/features/listing/listing-url-state.js";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../app");
const read = (path: string) => readFileSync(resolve(appRoot, path), "utf8");
const entries = (value: ReturnType<typeof categoryMeta> | ReturnType<typeof searchMeta>) =>
  Object.fromEntries(value.flatMap((item) =>
    "name" in item && typeof item.name === "string" && "content" in item
      ? [[item.name, item.content]] : [],
  ));

const baseCategory = {
  category: { name_fa: "آسیاب", slug: "grinders", description: "آسیاب قهوه" },
  issue: null,
  products: { status: "ready", data: {} },
  urlState: {},
} as CategoryRouteData;
const canonical = "https://eqcofe.com/category/grinders";
const baseMeta = categoryMeta(baseCategory);
assert.equal(entries(baseMeta).robots, "index,follow");
assert.equal(baseMeta.find((item) => "href" in item && item.rel === "canonical" && item.href === canonical) !== undefined, true);
assert.equal(entries(categoryMeta({ ...baseCategory, urlState: { brand: "x" } })).robots, "noindex,follow");
assert.equal(entries(categoryMeta({ ...baseCategory, urlState: { cursor: "opaque" } })).robots, "noindex,follow");
assert.equal(entries(categoryMeta({ ...baseCategory, products: { status: "empty", reason: "no-result" } })).robots, "noindex,follow");
assert.equal(entries(categoryMeta({ ...baseCategory, issue: "not-found", category: null })).robots, "noindex,follow");
assert.equal(categoryMeta({ ...baseCategory, issue: "not-found", category: null }).some((item) => "rel" in item), false);
assert.equal(entries(searchMeta({ query: "آسیاب" } as SearchRouteData)).robots, "noindex,follow");
assert.equal(searchMeta(undefined).some((item) => "rel" in item), false);

assert.equal(hasActiveListingFilters({ q: "آسیاب" }), false);
assert.equal(hasActiveListingFilters({ q: "آسیاب", available: true }), true);
assert.match(describeSearchState({ status: "empty", reason: "filtered" }, null, "آسیاب")?.title ?? "", /فیلتر/);
assert.match(describeCategoryState({ status: "empty", reason: "filtered" }, null)?.title ?? "", /فیلتر/);

const root = read("root.tsx");
const search = read("routes/search.tsx");
const category = read("routes/category.tsx");
const controls = read("features/listing/ListingControls.tsx");
const css = read("styles/listing-controls.css");
assert.match(root, /export const meta/);
assert.doesNotMatch(root, /<title>/);
assert.match(search, /export const meta = \(\{ loaderData \}/);
assert.match(category, /export const meta = \(\{ loaderData \}/);
assert.match(search + category, /aria-busy=\{pending\}/);
assert.match(controls, /aria-expanded=\{expanded\}/);
assert.match(controls, /aria-controls="listing-filter-panel"/);
assert.match(css, /\.listing-controls__panel\[data-expanded="false"\]/);
assert.match(css, /@media \(min-width: 840px\)/);
assert.match(css, /min-block-size: var\(--eq-size-touch-min\)/);
assert.doesNotMatch(css, /\bbrown\b|(?:margin|padding|border)-(?:left|right)\s*:/i);

console.log(JSON.stringify({ status: "PASS", stage: "60-G", canonical, search: "noindex", filtered: "noindex", controls: "responsive-disclosure", states: "filtered-empty" }));
