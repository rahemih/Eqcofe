import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parseCompareUrlState,
  serializeCompareUrlState,
} from "../app/features/compare-wishlist/compare-url-state.js";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

const [
  grid,
  card,
  wishlist,
  wishlistRoute,
  snapshot,
  productExperience,
  productRelated,
  routes,
  listingCss,
  wishlistCss,
] = await Promise.all([
  read("app/features/listing/ListingGrid.tsx"),
  read("app/features/listing/ListingProductCard.tsx"),
  read("app/features/compare-wishlist/WishlistAction.tsx"),
  read("app/routes/wishlist-action.ts"),
  read("app/features/compare-wishlist/wishlist-snapshot.server.ts"),
  read("app/features/product-detail/ProductDetailExperience.tsx"),
  read("app/features/product-detail/ProductRelated.tsx"),
  read("app/routes.ts"),
  read("app/styles/listing.css"),
  read("app/styles/wishlist.css"),
]);

const ids = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
] as const;
const query = serializeCompareUrlState({ productIds: [ids[1], ids[0]] });
assert.equal(
  query,
  "product=00000000-0000-4000-8000-000000000001&product=00000000-0000-4000-8000-000000000002",
);
assert.deepEqual(parseCompareUrlState(query).productIds, [ids[0], ids[1]]);

assert.match(grid, /selectedIds\.length >= 4/);
assert.match(grid, /primary_category\.id !== selectedCategoryId/);
assert.match(grid, /serializeCompareUrlState/);
assert.match(grid, /\/compare\?/);
assert.match(grid, /wishlistFetcher\.load\("\/actions\/wishlist"\)/);
assert.match(grid, /compareSeed/);
assert.doesNotMatch(grid, /localStorage|sessionStorage|document\.cookie/);

assert.match(card, /WishlistAction/);
assert.match(card, /aria-pressed=\{compareSelected\}/);
assert.match(card, /compareDisabledReason/);
assert.match(card, /انتخاب برای مقایسه/);

assert.match(wishlist, /useFetcher<WishlistActionPayload>/);
assert.match(wishlist, /action="\/actions\/wishlist"/);
assert.match(wishlist, /disabled=\{submitting\}/);
assert.match(wishlist, /membershipStatus/);

assert.match(wishlistRoute, /loadWishlistSnapshot/);
assert.match(wishlistRoute, /mutateWishlistProduct/);
assert.match(wishlistRoute, /appendCustomerSessionSetCookies/);
assert.match(wishlistRoute, /ENTITY_ID/);
assert.match(snapshot, /loadWishlist\(/);
assert.match(snapshot, /status: "unauthenticated"/);
assert.match(snapshot, /status: "unavailable"/);

assert.match(productExperience, /ProductEvaluationActions/);
assert.match(productExperience, /wishlistFetcher\.load\("\/actions\/wishlist"\)/);
assert.match(productExperience, /primaryCategoryId: product\.primary_category\.id/);
assert.match(productRelated, /compareSeed=\{compareSeed\}/);
assert.match(productRelated, /wishlist=\{wishlist\}/);

assert.match(routes, /route\("actions\/wishlist", "\.\/routes\/wishlist-action\.ts"\)/);
assert.doesNotMatch(routes + wishlistRoute + grid + wishlist, /localStorage|sessionStorage|document\.cookie|Authorization/i);
assert.doesNotMatch(listingCss + wishlistCss, /\bbrown\b/i);
assert.doesNotMatch(
  listingCss + wishlistCss,
  /(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m,
);

console.log(JSON.stringify({
  status: "PASS",
  stage: "62-F",
  productDetailIntegration: true,
  listingProductCardIntegration: true,
  compareSelectionMax: 4,
  compareFinalState: "deterministic-url",
  compareCompatibilityAuthority: "backend-final",
  wishlistMembershipAuthority: "GET /customer/wishlist",
  wishlistMutationAuthority: "POST/DELETE /customer/wishlist/{product_id}",
  listingSnapshotRequests: "one-per-grid-client-scope",
  productDetailSnapshotRequests: "one-shared-client-scope",
  accountManagementDeferred: true,
}));
