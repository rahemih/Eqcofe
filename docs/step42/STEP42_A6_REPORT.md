# EQCOFE Step 42 / A6 — Wishlist Engine

Status: **COMPLETE / PASS**
Date: 2026-08-18
Baseline A5 artifact SHA-256: `d4edab340fb34dc17012d1ead59fdd1487b6a1d21db9d4c88f253c897b9fddda`

## Implemented
- Customer-owned Wishlist Engine with list/add/remove operations.
- Wishlist remains a unique set keyed by `(customer_id, product_id)` using the A3 database primary key.
- Add uses `ON CONFLICT DO NOTHING` and is fully idempotent; duplicate add emits no duplicate audit/outbox side effects.
- Remove is fully idempotent; removing an absent relation is successful and emits no side effects.
- Customer identity/ownership is server-derived from request context; no client-supplied customer id is accepted.
- Disabled/anonymized customers fail closed.
- Product existence validation is performed through a narrow Catalog-owned port and adapter; Customer contains no direct `catalog.*` SQL.
- Wishlist persistence stores only customer/product relationship and timestamp; it does not copy title, price, stock, media or sellability facts from Catalog.
- Transactional Audit + Outbox events for first add and effective remove.
- Added `customer.wishlist.item_added.v1` and `customer.wishlist.item_removed.v1` event contracts.
- CustomerModule wiring completed; HTTP routes remain intentionally deferred to A9.

## Verification
- A6 independent invariant audit: 24/24 PASS.
- A6 Wishlist unit tests: 6/6 PASS.
- Exact Node 24.18.1 / TypeScript 6.0.3 build: PASS, 0 errors.
- Full runtime regression: 55/55 PASS.
- OpenAPI: PASS, 510 paths / 579 operations / 1108 refs.
- Architecture: PASS, 301 files.
- Toman / No-Wallet / configuration-boundary policy: PASS.
- PostgreSQL 18.4 isolated branch: duplicate Add preserved exactly one relation; first Remove deleted it; second Remove affected zero rows without failure.

## GitHub traceability
- Branch: `eqcofe/step42-a6-wishlist`
- Base A5 HEAD: `82f90aad4d6ec34c7a4b6f730682f24d9845a9a9`
- A6 HEAD: `33d6040339993e9127210182a4c076a959d8e387`
- Delta: 11 commits / 11 files, ahead 11, behind 0.
- Repository mirror note: `catalog.module.ts` appears as added in GitHub because the connected repository does not contain the full canonical Catalog source tree. In the canonical A5 artifact it already existed; A6 only adds Catalog-port wiring plus the new port/adapter.

## Safety
- `backup-eqcofe-1` untouched.
- No main/default database branch modified.
- PostgreSQL verification used isolated branch `br-muddy-mountain-avr7zc8t`.
- No direct Customer -> Catalog persistence access introduced.
- No Pricing/Checkout -> Customer SQL introduced.
- No Wallet or money-unit change.
- No Customer HTTP controller added before A9.

## Next
Step 42 / A7 — Wholesale Application + Approval Engine.
