import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

const [
  compareRoute,
  compareState,
  compareTable,
  wishlist,
  listingGrid,
  listingCard,
  compareCss,
  wishlistCss,
  listingCss,
] = await Promise.all([
  read("app/routes/compare.tsx"),
  read("app/features/compare-wishlist/CompareState.tsx"),
  read("app/features/compare-wishlist/CompareTable.tsx"),
  read("app/features/compare-wishlist/WishlistAction.tsx"),
  read("app/features/listing/ListingGrid.tsx"),
  read("app/features/listing/ListingProductCard.tsx"),
  read("app/styles/compare.css"),
  read("app/styles/wishlist.css"),
  read("app/styles/listing.css"),
]);

assert.match(compareRoute, /useLocation/);
assert.match(compareRoute, /retryHref/);
assert.match(compareState, /تلاش دوباره با همین انتخاب‌ها/);
assert.match(compareState, /reloadDocument/);
assert.match(compareState, /پاک کردن نشانی و شروع دوباره/);

assert.match(compareTable, /role="region"/);
assert.match(compareTable, /aria-describedby="compare-scroll-hint"/);
assert.match(compareTable, /tabIndex={0}/);
assert.match(compareTable, /aria-label={`مشاهده محصول/);
assert.match(compareTable, /aria-label={`حذف .* از مقایسه/);

assert.match(listingGrid, /role="status"/);
assert.match(listingGrid, /aria-live="polite"/);
assert.match(listingGrid, /compare-selection__remove/);
assert.match(listingGrid, /aria-label={`حذف .* از انتخاب مقایسه/);
assert.match(listingCard, /aria-disabled={compareBlocked}/);
assert.match(listingCard, /aria-describedby={compareBlocked ? compareReasonId : undefined}/);
assert.doesNotMatch(listingCard, /disabled={!compareSelected/);

assert.match(wishlist, /aria-busy={submitting}/);
assert.match(wishlist, /aria-describedby={describedBy}/);
assert.match(wishlist, /feedbackId/);
assert.match(wishlist, /hintId/);
assert.match(wishlist, /disabled={submitting}/);

const css = compareCss + "\n" + wishlistCss + "\n" + listingCss;
assert.match(compareCss, /overflow-x: auto/);
assert.match(compareCss, /inset-inline-start: 0/);
assert.match(compareCss, /scrollbar-gutter: stable both-edges/);
assert.match(compareCss, /--eq-size-touch-min/);
assert.match(compareCss, /--eq-border-focus/);
assert.match(listingCss, /@media \(max-width: 360px\)/);
assert.match(listingCss, /compare-selection__remove:focus-visible/);
assert.match(wishlistCss, /--eq-color-status-success/);
assert.match(wishlistCss, /--eq-color-status-danger/);

assert.doesNotMatch(
  css,
  /(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m,
);
assert.doesNotMatch(css, /direction\s*:\s*ltr/i);
assert.doesNotMatch(css, /outline\s*:\s*(?:none|0(?:\D|$))/i);
assert.doesNotMatch(css, /\bbrown\b/i);
assert.doesNotMatch(
  compareRoute + compareState + compareTable + wishlist + listingGrid + listingCard,
  /localStorage|sessionStorage|document\.cookie|Authorization/i,
);

console.log(JSON.stringify({
  status: "PASS",
  stage: "62-G",
  compareKeyboardScrollableRegion: true,
  compareRecoveryPreservesUrl: true,
  compareLinkPurposeExplicit: true,
  compareSelectionLiveStatus: true,
  compareSelectionSummaryRemoval: true,
  compareBlockedReasonDescribed: true,
  wishlistAsyncDescribed: true,
  rtlLogicalCss: true,
  responsive320Hardening: true,
  focusRingUsesDesignToken: true,
  touchTargetToken: true,
  browserAuthAuthorityInvented: false,
  finalBrowserAcceptanceDeferredTo62H: true,
}));
