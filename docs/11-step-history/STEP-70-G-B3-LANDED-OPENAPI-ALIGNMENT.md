# Step70-G B3 — Landed-cost OpenAPI authority reconciliation

**HIGH / DRAFT / NOT CANONICAL.** Tracker: https://github.com/rahemih/Eqcofe/issues/388; Linear HOS-74. Base: main@946ccb63ed210305b0ced2fb12143944ff37b796. Task contract: EQCOFE-STEP70-G-B3-LANDED-OPENAPI-ALIGNMENT-001.

## Verified mismatch and bounded resolution
The existing Backend `ReceiptCostService` stores method `quantity` when absent, accepts only `quantity|value|manual`, and takes optional `allocations` on preview/finalize. Preview uses the persisted method. Finalize re-computes allocations transactionally under the current If-Match version; no preview ID exists, is stored or is validated. OpenAPI previously declared unsupported `weight`, required override `allocation_method`/unconsumed `manual_allocations` for preview, and a required `preview_id` and unused `reason` for finalize. Step56 AD-D-16 disallows invented frozen previews.

B3 adjusts exactly three OpenAPI schemas and marks the two read/compute request bodies optional. `allocation_method` on create is optional with default quantity and enum quantity/value/manual only. Preview and finalize have only optional `allocations[{goods_receipt_item_id:EntityId, allocated_amount_toman:MoneyToman}]`; no preview_id, reason or method override. Existing `procurement.landed_cost.manage` permission, `If-Match`, Step-Up and Idempotency-Key on finalize, and audit metadata remain unchanged. No changes to runtime endpoints, financial state machine, database, UX layout, or warehouse permissions.

## Evidence, testing and generated-source discipline
`src/generated/openapi.ts` is synchronized with the new schema and subject to an executable test that invokes the pinned `openapi-typescript` generator and compares the exact output. Additional source-backed tests verify service manual allocations duplicate/unknown candidate/exact total/negative and fractional Toman failures. Exactly 17 Step56/Step57 design JSON or manifest source-provenance digests are carried through; no semantic fields or immutable verdicts changed.

## Dependency and merge gates
B1 [#390](https://github.com/rahemih/Eqcofe/pull/390) must merge and be postmerge-canonical; B2 [#394](https://github.com/rahemih/Eqcofe/pull/394) must rebase/reverify/merge; B2C [#397](https://github.com/rahemih/Eqcofe/pull/397) must rebase/reverify/merge. Only then may B3 be rebased, recalculate source hashes and re-run exact-head CI, Phase A, CodeQL, deterministic Review, independent Security, ACTIVE Scope Lock and an explicit separately authorized Owner Human Gate, protected merge, exact-SHA postmerge and terminal Lock RELEASED. No approval, merge, completion or transfer of external gate evidence by opening this draft. Frontend PR #387 and 70-H remain gated. **Step71 not started.**
