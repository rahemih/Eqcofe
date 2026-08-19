# Step 36 Changelog — Procurement Engine

## Added
- `0009_procurement_engine.sql`.
- Procurement supplier, purchase request, purchase order, goods receipt, landed cost, supplier invoice and purchase-return models.
- `InventoryProcurementPort` and adapter for atomic receipt/reversal/revaluation/supplier-return stock effects.
- Procurement domain rules and event contracts.
- Procurement controller/services/repository.
- Supplier invoice reconciliation actions.
- Purchase return lifecycle and stock-bucket lineage.
- Procurement test coverage for receipt arithmetic and landed-cost allocation.

## Correctness improvements made during implementation
- Rebased on the 10-loop reviewed Step 35 baseline.
- Goods Receipt rejected quantity no longer advances PO received quantity.
- PO receipt reversal returns PO status to `sent` when received quantity becomes zero.
- Closed PO receipt reversal is blocked.
- Partial PO close converts remaining quantity to cancelled quantity and requires a reason.
- Landed costs no longer inflate supplier-payable PO total.
- Landed-cost receipt linkage automatically inherits and verifies parent PO linkage.
- Supplier Invoice match requires exact PO total and a linked PO.
- Manual landed-cost allocation rejects negative, duplicate, foreign, or non-exact allocations.
- Receipt unit cost from PO is checked against net unit purchase cost after line discount.
- Purchase returns cannot exceed the selected source receipt's owned quantity.
- Purchase-return source stock bucket is persisted before approval and is not silently changed at ship time.
- OpenAPI DTOs were narrowed to fields actually supported by runtime handlers.
- Removed stale request bodies from no-body state transition endpoints.
