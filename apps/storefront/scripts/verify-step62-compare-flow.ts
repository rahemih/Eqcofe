import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CompareUrlStateError,
  parseCompareUrlState,
  removeCompareProduct,
  serializeCompareUrlState,
} from "../app/features/compare-wishlist/compare-url-state.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";

const parsed = parseCompareUrlState(`product=${B}&product=${A}`);
assert.deepEqual(parsed.productIds, [A, B]);
assert.equal(serializeCompareUrlState(parsed), `product=${A}&product=${B}`);
assert.equal(serializeCompareUrlState(removeCompareProduct(parsed, A)), `product=${B}`);

assert.throws(
  () => parseCompareUrlState(`product=${A}&product=${A}`),
  (error: unknown) => error instanceof CompareUrlStateError && error.code === "COMPARE_PRODUCT_DUPLICATE",
);
assert.throws(
  () => parseCompareUrlState(`product=${A}&product=${B}&product=${C}&product=${D}&product=55555555-5555-4555-8555-555555555555`),
  (error: unknown) => error instanceof CompareUrlStateError && error.code === "COMPARE_PRODUCT_LIMIT_EXCEEDED",
);
assert.throws(
  () => parseCompareUrlState("cursor=opaque"),
  (error: unknown) => error instanceof CompareUrlStateError && error.code === "COMPARE_QUERY_KEY_UNSUPPORTED",
);

const route = await readFile(new URL("../app/routes/compare.tsx", import.meta.url), "utf8");
const dataSource = await readFile(
  new URL("../app/features/compare-wishlist/compare-route-data.server.ts", import.meta.url),
  "utf8",
);
const table = await readFile(
  new URL("../app/features/compare-wishlist/CompareTable.tsx", import.meta.url),
  "utf8",
);

assert.doesNotMatch(route, /RoutePlaceholder/);
assert.match(route, /loadCompareRouteData/);
assert.match(route, /CompareTable/);
assert.match(route, /appendCustomerSessionSetCookies/);
assert.match(dataSource, /validateCompare/);
assert.match(dataSource, /loadCompare/);
assert.match(dataSource, /product_ids: urlState\.productIds/);
assert.match(dataSource, /urlState\.productIds\.length < 2/);
assert.match(table, /scope="col"/);
assert.match(table, /scope="row"/);
assert.match(table, /current_toman/);
assert.doesNotMatch(table, /availability|stock|discount/i);

console.log(JSON.stringify({
  status: "PASS",
  stage: "62-D",
  deterministicCompareUrl: true,
  maxProducts: 4,
  backendCompatibilityAuthority: true,
  placeholderRemoved: true,
  wishlistUiStarted: false,
}));
