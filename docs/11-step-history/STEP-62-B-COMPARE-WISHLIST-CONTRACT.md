# EQCOFE — Step 62-B Compare & Wishlist Contract Readiness

## Status
Stage 62-B is **STARTED / PRE-CHANGE GATED** from canonical main `18ba870afb4d0b192cfbcd5e60fd0f8f754f6ba4`.

Owner authorization to start 62-B is confirmed. Because this is HIGH risk, final Human Gate evidence will be emitted only after the exact final head and artifact are frozen.

## Live guard
- canonical main: `18ba870afb4d0b192cfbcd5e60fd0f8f754f6ba4`
- open PRs at start: **0**
- active relevant Locks at start: **0 observed**
- predecessor 62-A: **CANONICAL_COMPLETE / LOCK RELEASED**
- Linear: `HOS-66` remains **In Progress**

## Focused discovery

### Compare runtime
Existing runtime already provides the business authority:
- `POST /compare/validate`
- `POST /compare`
- one to four product IDs
- duplicate rejection
- product existence validation
- fail-closed primary-category compatibility
- authoritative pricing
- only specifications marked comparable

No Compare domain rewrite is authorized.

### Wishlist runtime
Existing runtime already provides:
- `GET /customer/wishlist`
- `POST /customer/wishlist/:product_id`
- `DELETE /customer/wishlist/:product_id`
- customer-only authorization
- active-customer validation
- product existence validation
- idempotent add/remove semantics
- server-side uniqueness
- audit/outbox on real mutation

No Wishlist domain rewrite is authorized.

## Contract drift to repair after Graphify gate
1. `POST /compare` successful response is untyped in OpenAPI.
2. `POST /compare/validate` successful response is untyped and OpenAPI currently advertises a generic 202 not produced by runtime.
3. `GET /customer/wishlist` successful response is untyped.
4. Wishlist add successful response is untyped and OpenAPI advertises 202 although runtime returns 200.
5. Product-id parameter/error/idempotency declarations require exact alignment with current runtime.
6. Generated TypeScript must remain byte-for-byte reproducible from canonical OpenAPI.

## Graphify pre-change gate
Step 62-A froze this mandatory sequence before any Contract/Runtime mutation:

`health -> graph query/path/explain -> focused source read -> mutation -> tests -> graph refresh -> health`

The canonical graph is local under `graphify-out/` and intentionally ignored by Git. The connected GitHub surface cannot access that local artifact.

Therefore:
- Task Contract and this Stage-B evidence document may be registered now.
- **No change to `contracts/http/openapi.yaml`, `src/generated/openapi.ts` or tests is allowed until local Graphify reports FRESH/PASS at current main and focused query/path/explain evidence is captured.**

## Frozen implementation boundary

### Allowed after graph gate
- OpenAPI Compare/Wishlist response typing
- exact status/error/security/idempotency alignment
- generated TypeScript regeneration
- deterministic contract regression tests
- generator-equivalent Step56/57 hash-only provenance repair if CI requires it

### Forbidden
- Catalog runtime rewrite
- Customer/Wishlist runtime rewrite
- Auth implementation mutation
- DB migration
- dependency changes
- Storefront Compare/Wishlist UI implementation
- Cart/Checkout work
- new pricing/inventory authority

## Stage-B Definition of Done
- Graphify pre-change gate PASS
- OpenAPI/runtime contracts aligned
- generated contract parity PASS
- focused Compare/Wishlist tests PASS
- no forbidden runtime mutation
- exact-head Canonical CI / Phase A / Review / Verification / Security PASS
- final artifact-bound Owner Human Gate recorded
- ACTIVE Lock recorded
- protected merge
- exact-SHA postmerge verify PASS
- terminal Lock RELEASED
