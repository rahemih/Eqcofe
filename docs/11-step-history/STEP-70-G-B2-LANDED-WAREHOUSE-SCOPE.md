# Step 70-G B2 — Landed-cost linked warehouse scope

**IN PROGRESS / HIGH RISK / NOT CANONICAL**. Base `main@946ccb63ed210305b0ced2fb12143944ff37b796`; tracker [#388](https://github.com/rahemih/Eqcofe/issues/388), Linear HOS-74, dependent Backend PR [#390](https://github.com/rahemih/Eqcofe/pull/390).

## Authorization change

Before allocation-candidate reads or inventory revaluation, `ReceiptCostService.previewAllocation` and `finalizeLandedCost` resolve each linked Goods Receipt and Purchase Order inside the existing transaction. Every linked source must yield an authoritative `warehouse_id`, the actor must pass `ScopePolicy.assert(actor,'warehouse',id)`, and receipt/PO warehouse identities must agree. Missing, inconsistent or inaccessible references **fail closed**. No guessed warehouse, no new permission, no bypass.

## Test cases

- Cross-warehouse preview/finalize denied before candidate access or financial side effects.
- Different warehouse receipt vs PO rejected even for globally scoped actor.
- Missing warehouse source rejected.
- Two matching linked warehouses permit preview.
- PO-only linked warehouse permits preview only after authorization.

## Deferred B3 contract compatibility

The OpenAPI landed-cost preview `allocation_method/manual_allocations`, finalize `preview_id`, and unsupported `weight` remain contract/runtime mismatches; this B2 task does **not** alter that authority. New schema contract, updated types and Step56/57 semantic review require a separate HIGH-risk governed patch. UI PR #387 must keep unsupported transitions blocked.

## Governance

17 Step56/57 provenance artifacts are permitted only for source-hash propagation, no semantic/history mutation. B1 PR #390 must become canonical before B2 can be merged; B2 must then be rebased and exact provenance regenerated, with no evidence transfer. Mandatory: exact-head CI, Phase A, CodeQL, independent Security, deterministic Review, ACTIVE Lock, explicit Owner Human Gate, protected merge and exact-SHA postmerge verification.
