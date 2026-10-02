# EQCOFE — Step 62-A Canonical Handoff

## Status
Step 62 — Compare & Wishlist: **STARTED at Stage A / governance-only**.

Live guard baseline:
- canonical repository: `rahemih/Eqcofe`
- canonical branch: `main`
- main SHA before Stage-A write: `cd9710e2294c540d8c528aa5e2372aae63fc5c70`
- open PRs before write: **0**
- competing writer: **NONE OBSERVED**
- relevant active Locks before write: **0 observed**
- Step 61: **CLOSED / FINAL CANONICAL PASS**
- Linear Step 62: `HOS-66` is In Progress for Discovery only; implementation was not canonical before this Stage-A branch
- Roadmap / Current State before write: **Step 62 = NEXT / NOT_STARTED**

## Discovery summary

### Compare
- Runtime endpoints already exist: `POST /compare/validate` and `POST /compare`.
- Backend accepts 1..4 product IDs, rejects duplicates, rejects missing/non-comparable products, and fails closed when primary categories differ.
- Response derives authoritative pricing and only specifications marked comparable.
- Stage 62 does **not** need a new comparison domain or client-side compatibility truth.

### Wishlist
- Runtime endpoints already exist: `GET /customer/wishlist`, `POST /customer/wishlist/:product_id`, `DELETE /customer/wishlist/:product_id`.
- Endpoints are customer-only.
- Service checks active customer, product existence, customer ownership and UUID validity.
- Add/remove are idempotent; persistence uniqueness is server-side; audit/outbox events are emitted on real mutations.
- Storefront must consume this state rather than invent a local source of truth.

### Frontend / design handoff
- Step 55 and Step 57 artifacts already define Compare selection/table and Wishlist UX states.
- Step 60 and Step 61 explicitly reserved Compare/Wishlist runtime work for Step 62.
- Product Detail and Listing are therefore integration entry points, not authorities for Compare/Wishlist business rules.

## Graphify evidence and boundary
- Graphify operational tooling is present on canonical main.
- `AGENTS.md` requires: health -> graph query/path/explain -> focused source read -> mutation -> focused tests -> graph refresh -> health.
- Canonical graph files under `graphify-out/` are local derived artifacts and intentionally ignored by Git.
- The connected GitHub execution surface cannot inspect that local artifact directly. Stage 62-A therefore uses committed Graphify operational contracts plus focused source reads only.
- **Before any runtime mutation in 62-B or later:** local executor must record FRESH/PASS graph health and at least one query/path/explain trace covering Compare/Wishlist dependencies and impacted modules.

## Scope freeze

### IN — Step 62
- Compare up to four products
- same-primary-category compatibility enforced by backend authority
- deterministic compare URL/state behavior
- authoritative specifications/pricing display
- authenticated Wishlist list/add/remove/toggle
- anonymous/auth-boundary handling without false success
- deterministic loading/empty/error/recovery states
- Product Detail and Listing/ProductCard integration points
- Persian RTL, accessibility and responsive behavior
- integrated acceptance and protected canonical closure

### OUT — later steps
- Step 63 Cart / Checkout / Shipping / Payment pages and flow
- Step 64 Account / after-sales beyond the minimum dependency needed to expose wishlist state
- Step 65+ Wholesale / content / admin / launch work
- new Wallet semantics
- new pricing/inventory authority
- unnecessary backend rewrite, migration or dependency

## Governed execution plan
1. **62-A — Canonical handoff, live guard, discovery & scope freeze**
2. **62-B — Backend/OpenAPI Compare & Wishlist contract readiness**
3. **62-C — Shared Storefront Compare/Wishlist data-state foundation**
4. **62-D — Production Compare flow and deterministic URL/state**
5. **62-E — Authenticated Wishlist flow and auth/recovery boundary**
6. **62-F — Product Detail + Listing/ProductCard integration**
7. **62-G — UX states, accessibility, RTL and responsive hardening**
8. **62-H — Integrated browser acceptance**
9. **62-I — Final canonical closure and Step 63 handoff**

## Inherited invariants
- Persian-first `fa-IR`, RTL
- integer Toman
- no Wallet
- no brown Brand/UI palette
- backend/generated OpenAPI remain authoritative
- no invented client-side business truth
- fail-closed auth/error behavior
- accessibility and responsive gates remain mandatory
- runtime/API/DB/dependency mutation is forbidden in 62-A

## Stage-A Definition of Done
- live guard and prerequisite closure evidence captured
- Compare/Wishlist implementation discovery captured
- A-I plan and IN/OUT boundary frozen
- Graph operational boundary recorded
- Task Contract exists and scope is deterministic
- Task Catalog is reconciled deterministically
- Linear HOS-66 is synced without claiming implementation completion
- exact-head verification / Phase A / Merge Policy pass
- valid REVIEW + ACTIVE LOCK evidence
- protected merge
- exact-SHA postmerge verification
- terminal Lock RELEASED
- only after all of the above may Stage 62-B start
