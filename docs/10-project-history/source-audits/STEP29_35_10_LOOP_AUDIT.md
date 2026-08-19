# EQCOFE — Steps 29–35 Ten-Loop Review Audit

Date: 2026-08-11
Scope: Backend architecture (29), module specification (30), runnable scaffold (31), Identity/RBAC/FIDO2 (32), Catalog (33), Pricing (34), Inventory (35).

## Executive result

The Step 35 repository was reviewed as one integrated system in ten passes. Issues found during the review were corrected in this reviewed baseline rather than only documented. No known internal architecture/contract/domain defect remains in the audited scope after the final regression pass.

This is not a claim that the project is production-deployed. The environment/provider gates listed at the end remain explicit and fail-closed.

## Loop 1 — Architecture, ownership, stale artifacts

Checked module boundaries, domain/infrastructure direction, cross-module repository access, temporary/stale files, Toman/no-wallet policy.

Changes:
- Removed stale `inventory.repository.ts.tmp`.
- Added architecture rule forbidding `any` in Domain layers.
- Confirmed no cross-domain repository imports and no circular module graph in the active implementation.

Result: PASS.

## Loop 2 — Reservation and late-payment state consistency

Found a real defect: expiration released `reserved` stock, but `late_payment_review -> converted` still expected the reservation quantity to remain reserved. Late payments could therefore not safely recover even when stock was available, and another release path risked double-release semantics.

Changes:
- Expiry/release now records `released_quantity` per reservation item.
- Late-payment conversion atomically re-acquires previously released stock after re-checking online sellable availability.
- If stock cannot be re-acquired, conversion fails closed with `LATE_PAYMENT_STOCK_UNAVAILABLE`.
- Converted events identify late-payment recovery.

Result: PASS.

## Loop 3 — Pricing/Inventory dependency direction and cost basis

Found a conceptual bidirectional dependency: Inventory implemented a type imported from Pricing while Pricing imported InventoryModule.

Changes:
- Inventory now exports its own `INVENTORY_COST_BASIS_PORT`.
- Pricing owns an adapter that implements `PricingCostBasisPort` by consuming Inventory's public port.
- Dependency is one-way: Pricing -> Inventory.
- Profit Guard cost basis is conservative: highest remaining sellable layer cost is used for the minimum safe unit price; weighted cost remains an informational read model.

Result: PASS.

## Loop 4 — Pricing rules and concurrency

Found two defects:
- A quantity-discount rule without `min_quantity` was rejected before the intended default of 11 could be applied.
- Bulk price Apply could act on a Preview made against an older base price.

Changes:
- Quantity discount now defaults to `min_quantity = 11` before validation.
- Pricing rule scope must be nonempty; global scope cannot be mixed with entity scopes.
- Bulk Apply re-checks every current base price against the preview snapshot and fails with `PRICE_CHANGED_SINCE_PREVIEW` if it changed.

Result: PASS.

## Loop 5 — HTTP/OpenAPI contract integrity

Checked active Identity/Admin/Catalog/Pricing/Inventory routes against OpenAPI.

Final results:
- OpenAPI paths: 486
- OpenAPI operations: 551
- Duplicate operationIds: 0
- `$ref` checked: 940
- Broken `$ref`: 0
- Active controller routes audited: 155
- Route drift: 0

Remaining architectural gate: OpenAPI is the machine-readable contract, but the runtime does not yet have one central generated-schema validation layer for every request. Implemented modules contain domain/application validation and route-contract coverage, so this is not an uncovered route defect; it remains a mandatory pre-production hardening item.

Result: PASS for contract consistency; production runtime-validation gate remains explicit.

## Loop 6 — Idempotency and post-commit safety

Found multiple safety issues:
- Replayed requests did not restore the original HTTP response status.
- Idempotency scopes were not principal-bound.
- A stale `running` operation could previously be reclaimed after a lease.
- More importantly, treating any handler error as `failed` was unsafe because a handler could commit a business transaction and then fail while building the response, allowing a duplicate mutation on retry.

Changes:
- Replay restores the stored status code.
- Scope is bound to the authenticated account or a hash of the checkout capability token.
- Expired `running` results are fail-closed as `IDEMPOTENCY_OUTCOME_UNKNOWN`; they are never automatically re-executed.
- A failure persisting the idempotency result after a successful handler leaves the operation unknown/fail-closed.
- Handler errors are no longer automatically declared retry-safe. Only an explicit recovery path may mark an operation definitely failed.

Result: PASS with fail-closed semantics.

## Loop 7 — RBAC scope enforcement

Found a real authorization gap: warehouse scopes were loaded into staff sessions but Inventory operations only checked permissions, allowing a warehouse-scoped user to submit another warehouse ID.

Changes:
- Added central `ScopePolicy`.
- Inventory reads and writes now enforce warehouse scopes.
- Transfers require access to both source and destination warehouses.
- Restricted staff cannot create a new globally unscoped warehouse.
- System/service actors retain controlled bypass semantics.

Result: PASS.

## Loop 8 — Inventory invariants and cost lineage

Found several consistency/validation issues:
- Unknown `adjustment_type` could fall into a generic path.
- Reservation dates and duplicate reservation/transfer items lacked explicit domain validation.
- Bucket changes (sellable -> damaged/quarantine) were represented as physical quantity changes in the movement ledger even though on-hand stock had not physically changed.

Changes:
- Explicit adjustment-type allowlist and validation.
- Reservation expiry/grace validation and duplicate item protection.
- Duplicate transfer variant protection.
- Sale consumption re-checks warehouse scope.
- Inventory movements now distinguish physical quantity delta from bucket transition using `bucket_from` / `bucket_to`; damage/quarantine transfers can have `quantity_delta = 0` while preserving physical on-hand.
- Cost layers remain condition-aware (`sellable`, `quarantine`, `damaged`) so FIFO does not consume non-sellable cost layers.
- Added permanent Inventory domain tests for availability, 20% protection behavior, FIFO lineage, insufficient layers and weighted cost.

Result: PASS.

## Loop 9 — Media/integration boundary and production configuration

Found an incomplete integration boundary: Media upload URL generation lived directly in the application service, included an insecure development fallback secret, and defaulted to an internal URL that might not exist.

Changes:
- Added `MediaStoragePort`.
- Added configured storage adapter outside the application layer.
- Removed fallback signing secret and fake/default upload endpoint behavior.
- Production boot now requires `MEDIA_UPLOAD_BASE_URL` and `MEDIA_UPLOAD_SIGNING_SECRET`.
- Media upload request remains fail-closed when storage is not configured.

Result: PASS.

## Loop 10 — Full regression and business-rule reconciliation

Re-ran architecture, policy, TypeScript syntax, OpenAPI refs/operations, route coverage, module cycles, temporary-file scan and domain tests.

Found one final business-rule omission: new warehouses defaulted to 0% physical-store protection, despite the project rule requiring a minimum 20% stock reservation for in-store sales.

Changes:
- Database default `physical_protection_percent` changed from 0 to 20.
- New warehouse application default changed from 0 to 20.
- Controlled administrative override remains available.

Final regression:
- Architecture check: PASS
- Toman/no-wallet policy: PASS
- TypeScript files syntax-scanned: 157
- Syntax errors: 0
- OpenAPI paths: 486
- OpenAPI operations: 551
- Duplicate operationId: 0
- `$ref`: 940
- Broken `$ref`: 0
- Active route drift: 0
- Module dependency cycles: 0
- `any` in Domain layer: 0
- `.tmp` artifacts: 0
- Domain/security/pricing/inventory tests: 25/25 PASS

## Important retained design rules verified

- Toman is the money unit; no legacy `_irr` fields were found in executable/database sources.
- Wallet remains excluded.
- Catalog -> Pricing -> Inventory dependency graph is acyclic.
- Pricing reductions fail closed when a safe cost basis cannot be established.
- Inventory separates physical on-hand, reservation, allocation, damage and quarantine.
- Physical-store protection defaults to 20%.
- Late payment cannot silently steal stock; it must atomically re-acquire availability.
- Idempotency prefers manual reconciliation over duplicate side effects when outcome is uncertain.
- Warehouse scopes are enforced, not merely stored.
- Media integration has an explicit port and production secrets are mandatory.

## Remaining gates — deliberately not hidden

These are not unresolved internal logic defects in Steps 29–35, but the repository must not be called production-ready until they are executed/connected:

1. **Full dependency build gate:** this environment has Node 22 and no installed project `node_modules`; the repository targets Node 24. Full `pnpm install`, TypeScript 6 build and NestJS integration test suite must run in the actual CI/dev environment.
2. **PostgreSQL execution gate:** migrations were statically reviewed but must be executed against the target PostgreSQL environment with lock/concurrency integration tests.
3. **Central runtime request-schema validation:** OpenAPI route/schema consistency is verified, but a central runtime OpenAPI/DTO validation layer for all requests still needs to be wired before production.
4. **External provider gates:** production OTP delivery, real media-storage endpoint, and automatic currency-rate provider require the provider choices/configuration from their integration phase. Current behavior is fail-closed rather than mocked-success.

## Conclusion

After ten review loops, all defects discovered inside the implemented Step 29–35 scope were corrected in this reviewed baseline. No known cross-module conflict or known internal business-logic defect remains from the findings in this audit. The four gates above remain explicit because they require the real build/database/provider environment rather than more speculative code inside this review.
