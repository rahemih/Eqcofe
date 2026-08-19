# EQCOFE Step 37 — Ten-Loop Re-Audit

## Status
**PASS after corrective changes.**

This review re-opened the final Step 37 repository and audited Cart, Checkout, Tax, Order, Inventory linkage, security capabilities, OpenAPI, scheduler lifecycle, database invariants and event contracts in ten independent loops. Findings were corrected in the reviewed repository before the final regression.

## Loop 1 — Architecture and policy
- Architecture guard: PASS (214 files scanned).
- Toman / No-Wallet / config-boundary policy: PASS.
- No new controller→database or circular module regression introduced by the review.

## Loop 2 — Capability and data-leak security
Found and fixed:
- Cart API was spreading persistence rows and could expose internal `token_hash`/persistence metadata not present in the public contract.
- Added an explicit Cart presenter/allowlist; Cart responses no longer expose persistence rows.
- Reconfirmed guest Order read/cancel requires `X-Checkout-Token`.
- Reconfirmed idempotency principal is scoped by customer identity / checkout capability / cart capability.

## Loop 3 — Cart response contract
Found and fixed:
- `CartView` was `additionalProperties: true`, masking contract leakage.
- Several Cart routes lacked exact success schemas.
- Added strict `CartItemView`, `CartView`, `CreateCartResponse`; customer active cart is explicitly nullable.
- Normalized Step-37 route HTTP success codes to actual runtime behavior.

## Loop 4 — Create-order and cancellation request contract
Found and fixed:
- `POST /checkout/{id}/order` still referenced the obsolete Step-28 `quote_id + reservation_id` request although runtime correctly derives reservation from Checkout.
- Replaced with `CreateCheckoutOrderRequest` containing an allowlisted address snapshot.
- Added application validation for recipient/mobile/province/city/postal/address fields.
- Aligned cancellation contract and runtime on `reason_code` + optional `note`.

## Loop 5 — Merge / stale quote / duplicate-order race
Found and fixed:
- A guest cart with an open `quoted` checkout could be merged, while that old quote could later reserve the converted source cart.
- Merge now expires source quoted checkouts atomically; target quoted checkouts are explicitly expired before merged mutation.
- Reserve now requires the underlying Cart itself to remain `active`.
- Database one-advanced-checkout constraint remains in force.

## Loop 6 — Sales, stock and shipping guards
Found and fixed:
- Add/update Cart previously deferred several sellability/stock failures until Quote.
- Add/update now rechecks Global/Brand/Category/Product/Variant sellability and current online-sellable stock.
- Shipping method is rechecked at Reservation and again immediately before Order creation, so a disabled method cannot ride through an old Quote.
- Final Inventory reservation remains the authoritative race-safe stock check.

## Loop 7 — Cart / Checkout / Order / Reservation expiry lifecycle
Found and fixed:
- Cart TTL existed but expired carts were not transitioned by Scheduler; an expired customer cart could remain the unique `active` cart and receive new access tokens.
- Added explicit Cart expiry scheduling and customer-cart expiry under advisory lock before view/access/merge.
- Checkout, Order and Inventory expiry orchestration remains active.
- Order pending deadline and Inventory `payment_grace_until` remain aligned.

## Loop 8 — Tax and database invariants
Verified / improved:
- Tax precedence: Product > Brand > Category > Global.
- Tax activation is serialized by PostgreSQL advisory lock plus overlap exclusion.
- Checkout and Order financial totals retain deferred commit-time reconciliation.
- Added DB-level minimum integrity checks for required Order address snapshot keys/mobile/postal/address.
- Tax and Shipping admin list responses now use allowlisted presenters rather than raw DB rows.
- `TaxRuleResponse` is now strict and all Tax mutation responses match it.

## Loop 9 — Pagination and runtime response envelope
Found and fixed:
- Customer-order cursor used only `created_at`, which could skip rows sharing the same timestamp. Cursor is now `(created_at,id)` and ordering is deterministic.
- Added a pagination marker understood by the response interceptor so pagination is emitted at `meta.pagination`, not nested inside `data.meta`.
- Found a cross-cutting Step-37 contract mismatch: runtime always returns `{success,data,meta}`, while Step-37 OpenAPI success responses described only raw data. All implemented Step-37 success schemas are now wrapped in the real Success Envelope.

## Loop 10 — Full regression
- Custom ten-loop assertions: 41/41 PASS.
- OpenAPI paths: 498.
- OpenAPI operations: 565.
- Local OpenAPI refs checked: 1044.
- Broken refs: 0.
- Duplicate operationId: 0.
- Duplicate operation parameters: 0.
- Event JSON schemas parsed: 27.
- Architecture: PASS.
- Policy: PASS.
- Intrinsic TypeScript parser errors in touched Step-37 files: 0.

## Real-environment gates (still explicit)
1. Full NestJS dependency-backed build/test requires Node 24 and `pnpm install`; this environment has no project `node_modules`.
2. Migration `0010_cart_checkout_orders.sql` must be executed on real PostgreSQL 18 with concurrency tests (cart creation/merge, tax activation, checkout reservation/order creation, deferred constraints and row locks).
3. The broader repository still has older pre-Step-37 endpoints whose OpenAPI success-envelope modeling should be normalized in a later cross-cutting contract-hardening pass; all **implemented Step-37** routes are now aligned with the runtime envelope.

## Conclusion
No known internal defect remains in the implemented Step-37 scope after this ten-loop corrective regression. This reviewed repository supersedes the previous Step-37 final artifact and should be the baseline for Step 38.
