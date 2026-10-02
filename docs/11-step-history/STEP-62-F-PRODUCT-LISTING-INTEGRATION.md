# Step 62-F — Product Detail + Listing/ProductCard Integration

## Current status

- Repository: `rahemih/Eqcofe`
- Canonical base: `87ba9461a0d2657c2419549b81d19423597c2ecf`
- Step 62-A through 62-E: `CANONICAL_COMPLETE`
- Step 62-E terminal Lock release comment: `5950495209`
- Stage 62-F: `IN_PROGRESS`
- Linear tracker: `HOS-66`

## Fresh Live Guard

Immediately before Stage 62-F:

- `main = 87ba9461a0d2657c2419549b81d19423597c2ecf`
- open Step-62 PRs = `0`
- competing Step-62 writer = `NONE OBSERVED`
- predecessor PR #296 = `MERGED / CLOSED`
- predecessor protected workflow_dispatch `36995751972` = `SUCCESS`
- predecessor exact-SHA postmerge job `110802067577` = `SUCCESS`
- predecessor Lock `LOCK-EQCOFE-STEP62-E-WISHLIST-ACTION-001-01` = `RELEASED`

## Scope

Stage 62-F integrates the canonical Compare/Wishlist foundations into customer-facing Product and Listing surfaces:

- shared `/actions/wishlist` resource route for membership snapshot and mutations;
- one client-side Wishlist snapshot per ListingGrid scope instead of per-card N+1 membership reads;
- one shared Product Detail Wishlist snapshot reused by the main product action and related-product cards;
- reusable WishlistAction uses a fetcher mutation against the canonical Stage 62-E server action;
- ListingProductCard exposes Wishlist and Compare actions;
- ListingGrid holds transient compare-selection UI state only, enforces a local max-four/same-primary-category guard, and emits the canonical deterministic `/compare?product=...` URL;
- Product Detail exposes ProductEvaluationActions and seeds related-product Compare selection with the current product;
- backend `POST /compare/validate` remains final Compare compatibility authority after navigation;
- backend Wishlist remains membership/mutation authority.

## Important boundary

This Stage does **not**:

- create browser auth/token state;
- store compare selection in localStorage/sessionStorage/cookies;
- create Account/Wishlist management pages;
- implement Product Alerts;
- change backend/OpenAPI/database/auth platform/dependencies/lockfiles;
- claim final accessibility/RTL/responsive completion — owned by 62-G;
- perform final integrated browser acceptance — owned by 62-H;
- update Roadmap/Current State before 62-I.

## State design

### Compare

- Selection UI is transient and local to the visible ListingGrid.
- Maximum is four products.
- Local category mismatch is blocked early using authoritative ProductCard primary-category refs.
- The final selected set is serialized with the canonical Stage 62-D URL helper.
- The Compare route still performs backend validation/loading, so the frontend guard is never final business authority.
- Product Detail seeds the current product into the related-products ListingGrid so selecting one related product immediately satisfies the two-product minimum.

### Wishlist

- ListingGrid hydrates one Wishlist snapshot from `GET /customer/wishlist` after the existing SSR listing renders.
- Product Detail hydrates one shared snapshot and passes it to both the primary action and related cards.
- Guest `401` becomes explicit unauthenticated state.
- Snapshot failure is represented as unavailable; mutation remains idempotent/server-authoritative.
- Mutations post to `/actions/wishlist`, which delegates to canonical Stage 62-E add/remove helpers and propagates validated customer-session Set-Cookie values.
- Browser code does not read `document.cookie`, localStorage/sessionStorage or Authorization.

## Historical verifier compatibility

The Stage 62-E Wishlist verifier is minimally transitioned in this workstream to recognize `aria-pressed={actionWishlisted}`, because the integrated fetcher now reflects the authoritative mutation result rather than the initial loader prop. Existing assertions for submitting lockout, hidden mutation fields, live feedback semantics and the Stage 62-E security/idempotency boundary remain enforced.

## Definition of Done

- exact predecessor closure and new canonical base captured;
- no competing Step-62 writer;
- Product Detail has Compare/Wishlist integration;
- shared ListingProductCard has Compare/Wishlist integration;
- ListingGrid selection caps at four and locally blocks primary-category mismatch without replacing backend validation;
- final Compare navigation uses canonical deterministic URL serialization;
- Wishlist membership/mutations remain backend authoritative and browser auth remains absent;
- no per-card Wishlist membership request pattern;
- legacy Search/Category SSR data loaders remain unchanged;
- dedicated 62-F verifier is part of Storefront `verify`;
- exact-head Canonical CI / Phase A / Storefront checks / deterministic review pass;
- exact-artifact ACTIVE Lock recorded;
- protected merge and exact-SHA postmerge verification pass;
- terminal Lock becomes `RELEASED`;
- only then may 62-G begin.

## Current boundary

```text
STEP_62_A_TO_E = CANONICAL_COMPLETE
STEP_62_F = IN_PROGRESS
STEP_62_G = BLOCKED_UNTIL_62_F_CANONICAL_COMPLETE
STEP_62_H_TO_I = NOT_STARTED
CLAIMED_CANONICAL_PASS = NO
```
