# EQCOFE Step 37 — Second Independent Ten-Loop Re-Audit

## Status
**PASS after corrective changes.**

This is a second, independent ten-loop audit of the already-reviewed Step 37 baseline. The repository itself was inspected again; prior audit reports were not treated as proof. Findings discovered in this pass were corrected before the final regression.

## Loop 1 — Architecture and project policies
- Re-ran architecture guard: PASS (214 files scanned).
- Re-ran Toman / No-Wallet / configuration-boundary policy: PASS.
- No cross-domain repository or presentation→database regression found.

## Loop 2 — Capability-token and response-leak security
- Rechecked Cart/Checkout bearer capability handling.
- Rechecked guest-order read/cancel ownership and customer-order ownership.
- No raw Cart/Order persistence rows or token hashes are returned by Step-37 presenters.
- Cart access tokens remain hashed at rest; guest primary token is invalidated on Guest→Customer ownership transfer.

## Loop 3 — HTTP/OpenAPI response and security contract
- Re-parsed OpenAPI independently.
- No broken local references, duplicate operation IDs, or duplicate operation parameters.
- Cart/Checkout/Order/Tax/Shipping implemented routes remain aligned with OpenAPI.

## Loop 4 — Order aggregate/state/event ordering
Found and fixed a real event-ordering defect:
- `order.created.v1` and `order.submitted.v1` were both emitted with `aggregate_version=1` while the persisted Order also remained version 1.
- This violated the per-aggregate ordering contract and could make a version-aware consumer classify the second event as duplicate/stale.

Correction:
- Created event = aggregate version 1.
- Submitted event = aggregate version 2.
- Newly persisted pending-confirmation Order = version 2.
- Later cancel/expire transitions therefore continue from version 3.

## Loop 5 — Browser runtime, CORS and idempotency boundary
Found and fixed a real browser-runtime defect:
- Step 37 uses `X-Cart-Token`, but API CORS `allowedHeaders` did not include `x-cart-token`.
- Cross-origin storefront Cart mutations could therefore fail browser preflight even though the API and OpenAPI were correct.

Correction:
- Added `x-cart-token` to CORS allowed headers.
- Reconfirmed `x-checkout-token`, `idempotency-key`, `if-match`, and step-up headers are retained.
- Rechecked fail-closed idempotency outcome policy.

## Loop 6 — Financial snapshots, Tax, Shipping and Reservation timing
- Rechecked integer-Toman calculations and Price/Tax snapshot persistence.
- Rechecked Product > Brand > Category > Global Tax precedence.
- Rechecked Shipping active-state validation at Quote/Reserve/Create Order.
- Rechecked Order deadline ↔ Inventory payment grace alignment.
- No additional defect found in this pass.

## Loop 7 — Scheduler lifecycle and NestJS dependency injection
Found and fixed a runtime DI defect:
- `SchedulerTasksService` directly injects `InventoryService`, but `SchedulerAppModule` did not directly import `InventoryModule`.
- Importing modules that themselves import Inventory does not make InventoryService visible to the Scheduler module unless re-exported.

Correction:
- `SchedulerAppModule` now imports `InventoryModule` directly.
- Cart, Checkout, Order and Inventory expiry orchestration remains once per minute.

## Loop 8 — Event producer ↔ JSON Schema fidelity
Found and fixed two Event Contract defects:
1. Runtime `order.cancelled.v1` emits `reason_code + note`, while its schema required obsolete `reason`.
2. `order.created.v1` used `total_toman`, while the project's canonical Event Catalog uses `grand_total_toman`.

Correction:
- Runtime and schema now use `grand_total_toman` for Order Created.
- Cancelled schema now matches `reason_code + note` and includes `order_number`.
- Created/Submitted/Cancelled/Expired Order schemas are now `additionalProperties: false`.
- Producer aggregate versions were checked together with schema fidelity.

## Loop 9 — Cart API completeness and historical contract preservation
Found a completeness regression against the earlier API contract:
- Item removal was only available indirectly through `PATCH quantity=0`; the original contract had a dedicated DELETE operation.

Correction:
- Restored `DELETE /cart/{id}/items/{itemId}`.
- It is capability-protected and semantically idempotent: deleting an already-missing item leaves the Cart unchanged.
- OpenAPI now includes `deleteCartItem` using the strict Cart response envelope.

## Loop 10 — Full corrective regression
Final independent checks after all fixes:
- Architecture: PASS.
- Project policies: PASS.
- OpenAPI paths: 498.
- OpenAPI operations: 566.
- Duplicate operation IDs: 0.
- Local OpenAPI refs checked: 1048.
- Broken local refs: 0.
- Duplicate operation parameters: 0.
- Step-37 controller routes audited: 22.
- Step-37 route drift: 0.
- Event JSON schemas parsed: 27; invalid JSON: 0.
- Broken relative imports: 0.
- TypeScript parser/syntax-class errors (TS1xxx): 0.
- CORS includes both Cart and Checkout capability headers.
- Scheduler imports InventoryModule directly.
- Order producer/schema/version assertions: PASS.

## Explicit real-environment gates
These remain gates rather than being falsely marked PASS:
1. Full dependency-backed NestJS build/test must run on Node 24 after `pnpm install`. This audit environment has Node 22 and no project `node_modules`.
2. Migration `0010_cart_checkout_orders.sql` must be exercised on PostgreSQL 18 with concurrency/lock/deferred-constraint tests.
3. The broader pre-Step-37 HTTP surface still needs the previously documented global response-envelope normalization pass; implemented Step-37 routes are aligned.

## Conclusion
No known internal defect remains in the audited Step-37 scope after this second independent ten-loop pass. This artifact supersedes `eqcofe-backend-step37-reviewed-10loop.zip` and should be the baseline for Step 38.
