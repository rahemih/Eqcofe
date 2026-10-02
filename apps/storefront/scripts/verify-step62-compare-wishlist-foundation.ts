import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const contract = await readFile(
  new URL("../app/features/compare-wishlist/compare-wishlist-contract.ts", import.meta.url),
  "utf8",
);
const data = await readFile(
  new URL("../app/features/compare-wishlist/compare-wishlist-data.server.ts", import.meta.url),
  "utf8",
);
const state = await readFile(
  new URL("../app/features/compare-wishlist/compare-wishlist-state.ts", import.meta.url),
  "utf8",
);

assert.match(contract, /ApiRequestInput<"post", "\/compare\/validate">/);
assert.match(contract, /ApiSuccessData<"post", "\/compare">/);
assert.match(contract, /ApiSuccessData<"get", "\/customer\/wishlist">/);
assert.match(contract, /ApiRequestInput<"post", "\/customer\/wishlist\/\{product_id\}">/);
assert.match(contract, /ApiRequestInput<"delete", "\/customer\/wishlist\/\{product_id\}">/);
assert.doesNotMatch(contract, /interface\s+(Compare|Wishlist)/);

assert.match(data, /createCustomerSessionBridge/);
assert.match(data, /"\/compare\/validate"/);
assert.match(data, /"\/compare"/);
assert.match(data, /"\/customer\/wishlist"/);
assert.match(data, /"\/customer\/wishlist\/\{product_id\}"/);
assert.doesNotMatch(data, /fetch\s*\(/);
assert.doesNotMatch(data, /Authorization/i);

assert.match(state, /AsyncSurfaceState<CompareValidateResponse>/);
assert.match(state, /AsyncSurfaceState<CompareResponse>/);
assert.match(state, /AsyncSurfaceState<WishlistListResponse>/);
assert.match(state, /compare:\s*"backend"/);
assert.match(state, /wishlist:\s*"backend"/);

console.log(JSON.stringify({
  status: "PASS",
  stage: "62-C",
  generatedContractAuthority: true,
  customerSessionBridge: true,
  routeProductionized: false,
  backendMutation: false,
}));
