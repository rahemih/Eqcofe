# Step 62-D — Production Compare Flow

## Current status

- Repository: `rahemih/Eqcofe`
- Canonical base: `66766c5803a94e378da7c95a78df1b8b2c2fc27f`
- Step 62-A: `CANONICAL_COMPLETE`
- Step 62-B: `CANONICAL_COMPLETE`
- Step 62-C: `CANONICAL_COMPLETE`
- Step 62-C terminal Lock release comment: `5949710464`
- Stage 62-D: `IN_PROGRESS`
- Linear tracker: `HOS-66`
- Primary implementation owner: `A3 — Frontend / Storefront Engineering`

## Fresh Live Guard

Immediately before Stage 62-D registration:

- `main = 66766c5803a94e378da7c95a78df1b8b2c2fc27f`
- open Step-62 PRs = `0`
- competing Step-62 writer = `NONE OBSERVED`
- predecessor PR #294 = `MERGED / CLOSED`
- predecessor protected workflow_dispatch `36989940721` = `SUCCESS`
- predecessor postmerge job `110783644820` = `SUCCESS`
- predecessor Lock `LOCK-EQCOFE-STEP62-C-COMPARE-WISHLIST-FOUNDATION-001-01` = `RELEASED`

An unrelated Dependabot PR may exist, but it is not a Step-62 writer and does not overlap this Task Contract scope.

## Scope

Stage 62-D productionizes only the Compare journey:

- deterministic Compare URL state using repeated `product=<UUID>` parameters;
- fail-closed rejection of unknown query keys, invalid UUIDs, duplicates and more than four selected products;
- first-use presentation without backend traffic when fewer than two products are selected;
- server-only `POST /compare/validate` then `POST /compare` through the canonical Step-62-C bridge;
- authoritative Compare table for current price and comparable specifications;
- remove-product links that deterministically rewrite Compare URL state;
- explicit loading/first-use/conflict/error/recovery presentation;
- dedicated deterministic Stage-D verifier integrated into Storefront `verify`.

## Explicit boundary

This Stage does **not**:

- implement Wishlist list/add/remove/toggle UI — owned by 62-E;
- add Compare/Wishlist actions to Product Detail or Listing/ProductCard — owned by 62-F;
- claim final accessibility/RTL/responsive hardening — owned by 62-G;
- mutate backend, OpenAPI, database, auth platform, dependencies or lockfiles;
- invent stock, discount or availability fields absent from the authoritative Compare response;
- update Roadmap or Current State before final Step-62 closure.

## URL contract

The Storefront-owned Compare navigation state uses only repeated `product` query keys.

- zero or one selected product is a bounded first-use state;
- two through four IDs may execute Compare;
- IDs must be canonical UUID-shaped values;
- duplicate IDs fail closed;
- unknown query keys fail closed;
- more than four IDs fail closed;
- serialization sorts IDs for a stable canonical query representation.

Backend `POST /compare/validate` remains the authority for category compatibility. The URL parser does not infer category or comparability.

## Data/rendering authority

The route consumes only Step-62-C generated-OpenAPI aliases and bridge adapters.

The Compare table renders:
- product identity;
- current integer-Toman price when present;
- server-returned comparable specifications;
- product-detail and remove-selection navigation.

The current Compare response does not expose authoritative stock/availability; Stage 62-D therefore does not fabricate or infer it.

## Definition of Done

- exact predecessor closure and new canonical base captured;
- no competing Step-62 writer or active predecessor Lock;
- production `/compare` route replaces the placeholder;
- deterministic URL state is fail-closed and capped at four;
- fewer than two selections do not issue Compare requests;
- compatibility remains backend authoritative;
- current price/specification output comes only from Compare response;
- no Wishlist UI or Product/Listing integration starts early;
- dedicated Stage-D verifier is part of Storefront `verify`;
- exact-head Canonical CI / Phase A / applicable Storefront checks / deterministic review pass;
- exact-artifact ACTIVE Lock recorded;
- protected merge and exact-SHA postmerge verification pass;
- terminal Lock becomes `RELEASED`;
- only then may 62-E begin.

## Current boundary

```text
STEP_62_A = CANONICAL_COMPLETE
STEP_62_B = CANONICAL_COMPLETE
STEP_62_C = CANONICAL_COMPLETE
STEP_62_D = IN_PROGRESS
STEP_62_E = BLOCKED_UNTIL_62_D_CANONICAL_COMPLETE
STEP_62_F_TO_I = NOT_STARTED
CLAIMED_CANONICAL_PASS = NO
```
