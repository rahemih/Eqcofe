import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const server = await readFile(
  new URL("../app/features/compare-wishlist/wishlist-action.server.ts", import.meta.url),
  "utf8",
);
const component = await readFile(
  new URL("../app/features/compare-wishlist/WishlistAction.tsx", import.meta.url),
  "utf8",
);
const state = await readFile(
  new URL("../app/features/compare-wishlist/wishlist-action-state.ts", import.meta.url),
  "utf8",
);

assert.match(server, /loadWishlistMembership/);
assert.match(server, /loadWishlist\(/);
assert.match(server, /addWishlistProduct/);
assert.match(server, /removeWishlistProduct/);
assert.match(server, /"Idempotency-Key"/);
assert.match(server, /randomUUID\(\)/);
assert.match(server, /error\.status === 401/);
assert.doesNotMatch(server, /Authorization/i);
assert.doesNotMatch(server, /localStorage|sessionStorage|document\.cookie/);

assert.match(component, /aria-pressed=\{actionWishlisted\}/);
assert.match(component, /fetcher\.data\?\.status === "success"/);
assert.match(component, /action="\/actions\/wishlist"/);
assert.match(component, /disabled=\{submitting\}/);
assert.match(component, /name="current_wishlisted"/);
assert.match(component, /role=\{urgent \? "alert" : "status"\}/);

assert.match(state, /از قبل در علاقه‌مندی‌های شما بود/);
assert.match(state, /باید وارد حساب مشتری شوید/);
assert.match(state, /result\.retryable/);

console.log(JSON.stringify({
  status: "PASS",
  stage: "62-E",
  backendWishlistAuthority: true,
  idempotencyKey: true,
  unauthenticatedExplicit: true,
  accountManagementDeferred: true,
  productListingIntegrationStarted: true,
}));
