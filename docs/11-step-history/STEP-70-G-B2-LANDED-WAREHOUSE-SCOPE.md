# EQCOFE Step 70-G B2 — Landed Cost warehouse authority (HIGH)

Status: **DRAFT / FAIL-CLOSED / NOT CANONICAL**. Parent [Issue #388](https://github.com/rahemih/Eqcofe/issues/388), Linear HOS-74, Backend B1 dependency [PR #390](https://github.com/rahemih/Eqcofe/pull/390), Admin [PR #387](https://github.com/rahemih/Eqcofe/pull/387).

## Threat and root cause

`procurement.landed_costs` has references to a goods receipt or purchase order but no direct warehouse column. `landedCostForUpdate` selected the cost row without resolving warehouse, and `ReceiptCostService.previewAllocation` and `finalizeLandedCost` did not assert the acting staff's warehouse scope. A staff member with permission but without the warehouse scope could preview allocations or finalize/revalue another warehouse's stock.

## Scoped remediation

- Locked aggregate query joins receipt/PO and projects `COALESCE(gr.warehouse_id,po.warehouse_id)` as `warehouse_id`, with `FOR UPDATE OF lc` locking only the landed cost, never the nullable side of an outer join.
- Both service operations fail closed when warehouse authority cannot be resolved. Both call existing `ScopePolicy.assert(actor,'warehouse',warehouseId)` before candidate reads, allocation persistence, inventory revaluation or audit events.
- Negative tests cover wrong-warehouse and missing-warehouse for **each** operation, and a positive authorized preview. Preserve existing transaction, Step-Up, idempotency, If-Match, signed-in actor semantics and allocation math.
- Controller, OpenAPI, generated types, DB schema, other modules, approval lifecycle, scheduled operations, and Step70-H/Step71 remain unchanged.
- 17 inherited Step56/Step57 design/prototype files are regenerated **source SHA only**; their UI semantics and historical verdicts remain immutable.

## Separate blockers

OpenAPI Preview/Finalize body shapes still differ from runtime, advertised `weight` method is not implemented, and `preview_id` is **not** an immutable allocation token. These require a later independent HIGH-risk contract reconciliation before enabling those Admin actions. B1 PR #390 must become canonical before any B2 protected merge/rebase to avoid stale provenance chain; no stacked PR auto-merge.

## Required gate chain

Exact-head `pnpm verify`, Phase A, CodeQL, Step57/Step58 where applicable, deterministic Review, independent Security and explicit ACTIVE Lock; Project Owner Human Gate on exact Head/Artifact; protected merge, exact-SHA postmerge verification and terminal Lock RELEASED. No evidence of these later gates is inferred here.
