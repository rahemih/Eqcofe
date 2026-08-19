# EQCOFE Step 36 — Procurement Engine Audit

## Baseline
Step 36 was rebased on `eqcofe-backend-step35-reviewed-10loop.zip`, not on the older Step 36 working branch. This preserves all 10-loop fixes from Steps 29–35 (late-payment reacquisition, warehouse scope enforcement, hardened idempotency, stale bulk-price protection, media fail-closed configuration, 20% physical-stock protection default, and dependency direction fixes).

## Implemented scope
- Suppliers: create/read/update/activate/deactivate, optimistic concurrency, audit.
- Purchase Requests: draft/create/update/submit/approve/reject/cancel/convert, separation of duties, warehouse scope.
- Purchase Orders: create/update/submit/approve/send/partial receive/receive/close/cancel, separation of duties, remainder cancellation on partial close.
- Goods Receipts: draft/update/submit/post/reverse, atomic Inventory receipt, quarantine support, rejected quantity exclusion, over-receipt prevention.
- Inventory/Cost Layer integration: accepted and quarantine stock create cost layers in the same DB transaction as Goods Receipt posting.
- Landed Costs: quantity/value/manual allocation, exact allocation sum, revaluation lineage for remaining inventory and already-consumed COGS.
- Supplier Invoices: record, match, dispute, cancel; matching requires PO and exact PO payable total.
- Purchase Returns: receipt lineage, approved quantity ceiling, persisted source stock bucket, inventory cost removal, shipped/completed events.
- Procurement Event JSON Schemas.
- OpenAPI contract, security metadata, If-Match, Step-Up and Idempotency metadata.

## Important consistency decisions
1. `accepted + quarantine + rejected = received` is enforced by database CHECK and application validation.
2. Only accepted + quarantine quantities advance Purchase Order received quantity; rejected goods do not become owned stock.
3. Goods Receipt POST is a single Procurement→Inventory DB transaction through `InventoryProcurementPort`; Procurement does not import Inventory repositories.
4. Goods Receipt reverse is blocked if cost layers were consumed, stock is encumbered, landed cost changed the layers, or the parent PO is already closed.
5. PO over-receipt is fail-closed by default.
6. A partially received PO can be closed only with a reason; remaining quantities become `cancelled_quantity`.
7. Landed Cost does not mutate supplier-payable PO total. It changes inventory/COGS valuation and emits a Finance-consumable revaluation event.
8. Receipt cost for a PO item is the net purchase unit cost after PO line discount. Purchase tax is stored separately and is not silently capitalized into inventory cost.
9. Purchase Return source bucket is persisted before approval; shipping cannot silently switch the approved bucket.
10. Supplier Invoice matching does not include external landed costs unless those costs are actually part of the supplier PO/invoice.

## Automated/static audit results
- Architecture check: PASS.
- Project policy check (Toman / No Wallet / config boundary): PASS.
- OpenAPI paths: 495.
- OpenAPI operations: 562.
- Duplicate operationId: 0.
- OpenAPI `$ref` checked: 969.
- Broken `$ref`: 0.
- Procurement OpenAPI operations: 46.
- Procurement controller routes: 46.
- Route ↔ OpenAPI drift: 0.
- Procurement security/permission metadata issues: 0.
- Required critical Step-Up/Idempotency/If-Match metadata issues: 0.
- Missing Procurement event contracts: 0.
- Broken relative imports in Step 36 files: 0.
- `any` in Procurement domain layer: 0.
- `_irr` / `rate_to_irr` in Step 36 scope: 0.
- Wallet references in Step 36 scope: 0.
- Intrinsic TypeScript diagnostics for new Step 36 files (after excluding missing dependency TS2307): 0.
- Inventory math test file: PASS (reports 5/5 internally).
- Procurement rules tests: 4/4 PASS.

## Migration invariant checks
- Goods Receipt arithmetic CHECK: present.
- PO received+cancelled <= ordered CHECK: present.
- Landed Cost allocation unique per receipt item: present.
- Cost revaluation unique per landed-cost/receipt-item: present.
- Purchase Return stock bucket CHECK: present.
- Cost Layer → Goods Receipt Item FK: present.
- Cost Revaluation → Goods Receipt Item FK: present.

## Environment gates — NOT falsely marked PASS
1. Full NestJS build cannot be verified here because project `node_modules` are not installed and the runtime is Node 22 while the repository targets Node 24. A global TypeScript 5.8 invocation reports missing NestJS/Node dependency types; the Step 36 files themselves have zero non-TS2307 intrinsic diagnostics under isolated checking.
2. Migration `0009_procurement_engine.sql` has been statically audited but has not been executed against a live PostgreSQL 18 instance in this environment. CI must run migrations and lock/concurrency integration tests against real PostgreSQL.
3. Runtime OpenAPI request validation remains a project-wide pre-production gate already identified in the Steps 29–35 review; Step 36 services independently validate critical domain invariants and do not rely solely on OpenAPI.
4. Finance consumers for `procurement.landed_cost.finalized.v1` and purchase-return accounting will be implemented in the Finance stage. Events and exact lineage are ready now.

## Result
No known Step 36 implementation defect remains after the available static/domain audit. Continue future development from the Step 36 final repository, not the older Step 36 working branch.
