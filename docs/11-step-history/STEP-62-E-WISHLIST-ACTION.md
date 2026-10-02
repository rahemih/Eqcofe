# Step 62-E — Authenticated Wishlist Action

## Current status

- Repository: `rahemih/Eqcofe`
- Canonical base: `07aec6ea68ba3276f299ab5d16ed4241db73ab51`
- Step 62-A: `CANONICAL_COMPLETE`
- Step 62-B: `CANONICAL_COMPLETE`
- Step 62-C: `CANONICAL_COMPLETE`
- Step 62-D: `CANONICAL_COMPLETE`
- Step 62-D terminal Lock release comment: `5950021286`
- Stage 62-E: `IN_PROGRESS`
- Linear tracker: `HOS-66`
- Primary implementation owner: `A3 — Frontend / Storefront Engineering`

## Fresh Live Guard

Immediately before Stage 62-E registration:

- `main = 07aec6ea68ba3276f299ab5d16ed4241db73ab51`
- open Step-62 PRs = `0`
- competing Step-62 writer = `NONE OBSERVED`
- predecessor PR #295 = `MERGED / CLOSED`
- predecessor protected workflow_dispatch `36993493345` = `SUCCESS`
- predecessor postmerge job `110794940332` = `SUCCESS`
- predecessor Lock `LOCK-EQCOFE-STEP62-D-COMPARE-FLOW-001-01` = `RELEASED`

## Scope

Stage 62-E builds only the reusable authenticated Wishlist action layer:

- load product membership from authoritative `GET /customer/wishlist`;
- add through `POST /customer/wishlist/{product_id}`;
- remove through `DELETE /customer/wishlist/{product_id}`;
- required `Idempotency-Key` generation/transport for add/remove;
- explicit unauthenticated state for backend `401`;
- submitting lockout so a mutation control cannot be re-triggered before authoritative result;
- success/idempotent-already-present/error/retry feedback;
- reusable Wishlist form component for later Product/Listing integration;
- dedicated deterministic Stage-E verifier integrated into Storefront `verify`.

## Explicit boundary

This Stage does **not**:

- modify `product.tsx`, Product Detail composition, Listing/ProductCard, Search or Category — owned by 62-F;
- create a customer Account/Wishlist management route — Account remains Step 64 scope;
- invent an OTP/login route that does not exist in the production Storefront;
- implement product alerts from the broader Step-55 design surface;
- mutate backend, OpenAPI, database, auth platform, dependencies or lockfiles;
- update Roadmap or Current State before final Step-62 closure.

## Authentication and idempotency

Customer authentication remains backend authority through the existing HttpOnly customer-session bridge. Browser code does not inspect session cookies or store auth state.

`GET /customer/wishlist` returning `401` becomes explicit unauthenticated UX state.

Both add and remove require generated-OpenAPI `Idempotency-Key` headers. Stage 62-E generates a UUID key on the server when the caller does not provide one and never removes the backend idempotency guarantee.

Because the Storefront still has no canonical OTP/login route, Stage 62-E does not create a fake navigation target. The unauthenticated state clearly tells the customer that login is required; auth continuation can only be integrated when the canonical auth surface exists.

## Definition of Done

- exact predecessor closure and canonical base captured;
- no competing Step-62 writer or active predecessor Lock;
- Wishlist membership comes only from backend Wishlist list;
- add/remove use the canonical Step-62-C bridge and required idempotency header;
- `401` is explicit unauthenticated state, not false success;
- submitting control cannot be double-triggered;
- idempotent already-present result has explicit success copy;
- no Product/Listing/Account integration starts early;
- dedicated 62-E verifier is part of Storefront `verify`;
- exact-head Canonical CI / Phase A / applicable Storefront checks / deterministic review pass;
- exact-artifact ACTIVE Lock recorded;
- protected merge and exact-SHA postmerge verification pass;
- terminal Lock becomes `RELEASED`;
- only then may 62-F begin.

## Current boundary

```text
STEP_62_A_TO_D = CANONICAL_COMPLETE
STEP_62_E = IN_PROGRESS
STEP_62_F = BLOCKED_UNTIL_62_E_CANONICAL_COMPLETE
STEP_62_G_TO_I = NOT_STARTED
CLAIMED_CANONICAL_PASS = NO
```
