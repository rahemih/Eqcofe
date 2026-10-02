# Step 62-C — Shared Compare/Wishlist Foundation

## Current status

- Repository: `rahemih/Eqcofe`
- Canonical base: `9050379610b5d8a4da80899a6a700041df184f01`
- Step 62-A: `CANONICAL_COMPLETE`
- Step 62-B: `CANONICAL_COMPLETE`
- Step 62-B Lock: `RELEASED`
- Stage 62-C: `IN_PROGRESS`
- Linear tracker: `HOS-66`
- Primary implementation owner: `A3 — Frontend / Storefront Engineering`

## Fresh Live Guard

Immediately before Stage 62-C registration:

- `main = 9050379610b5d8a4da80899a6a700041df184f01`
- open Step-62 PRs = `0`
- competing Step-62 writer = `NONE OBSERVED`
- predecessor PR #293 = `MERGED / CLOSED`
- predecessor protected run `36987733326` = `SUCCESS`
- predecessor postmerge job `110776625137` = `SUCCESS`
- predecessor Lock `LOCK-EQCOFE-STEP62-B-COMPARE-WISHLIST-CONTRACT-001-01` = `RELEASED`

## Scope

Stage 62-C creates only the reusable Storefront data/state foundation required by later Compare and Wishlist stages:

- generated-OpenAPI-derived Compare request/success aliases;
- generated-OpenAPI-derived authenticated Wishlist list/add/remove aliases;
- server-only access through the existing customer-session bridge;
- shared Compare/Wishlist async-state typing and explicit backend authority marker;
- deterministic Stage-C verification integrated into Storefront `verify`.

## Explicit boundary

This Stage does **not**:

- productionize the `/compare` route — owned by 62-D;
- implement deterministic compare URL selection state — owned by 62-D;
- implement authenticated wishlist UI/toggle/recovery flow — owned by 62-E;
- modify Product Detail or Listing/ProductCard integration points — owned by 62-F;
- perform final accessibility/RTL/responsive hardening — owned by 62-G;
- mutate backend, OpenAPI, database, auth platform, dependencies or lockfiles;
- update Roadmap or Current State before final Step-62 closure.

## Contract authority

`src/generated/openapi.ts` remains the only Storefront business-contract authority. Stage 62-C creates aliases through `ApiRequestInput` and `ApiSuccessData` and does not define parallel Compare/Wishlist DTOs.

All HTTP traffic goes through the existing server-only `createCustomerSessionBridge`. Browser Authorization is not introduced. Wishlist ownership/authentication and Compare compatibility remain backend authority.

## Definition of Done

- exact canonical base and predecessor closure captured;
- no overlapping Step-62 writer or active predecessor Lock;
- generated OpenAPI request/success types are reused directly;
- Compare validate/result and Wishlist list/add/remove server adapters use the customer-session bridge;
- no route or UI productionization occurs early;
- dedicated 62-C verifier is part of Storefront `verify`;
- no backend/OpenAPI/database/dependency/current-state/design mutation occurs;
- exact-head Canonical CI / Phase A / applicable Storefront checks / deterministic review pass;
- exact-artifact ACTIVE Lock recorded;
- protected merge and exact-SHA postmerge verification pass;
- terminal Lock becomes `RELEASED`;
- only then may 62-D begin.

## Current boundary

```text
STEP_62_A = CANONICAL_COMPLETE
STEP_62_B = CANONICAL_COMPLETE
STEP_62_C = IN_PROGRESS
STEP_62_D = BLOCKED_UNTIL_62_C_CANONICAL_COMPLETE
STEP_62_E_TO_I = NOT_STARTED
CLAIMED_CANONICAL_PASS = NO
```
