# EQCOFE Step 49 / A6 — Physical Sale Commit / Payment-Finance Integration Boundary

**Step:** 49 — Physical Store / POS Backend  
**Substep:** A6 — Physical Sale Commit / Payment-Finance Integration Boundary  
**Date:** 2026-08-22  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A6 establishes the authoritative physical-sale commit boundary. POS orchestrates the transaction but does not become the owner of payment truth, inventory truth, or finance truth.

## Implementation
- `database/migrations/0051_pos_commit_payment_finance.sql`
  - extends POS sale lifecycle with `committed`;
  - adds commit evidence (`warehouse_id`, `payment_receipt_id`, `total_cost_toman`, `committed_at`);
  - creates Payments-owned `payments.physical_sale_receipts`;
  - creates Finance-owned `finance.pos_sale_financial_facts` with integer-Toman revenue/COGS/gross-profit identity.
- `src/modules/payments/application/physical-sale-payment.service.ts`
  - Payments owns physical-sale payment receipt confirmation;
  - supports only explicit `cash` / `card` methods at this boundary;
  - receipt replay is idempotent for the same sale/amount/method/reference and conflicts fail closed.
- `src/modules/pos/application/physical-sale-commit.service.ts`
  - requires authenticated staff and optimistic sale version;
  - requires a complete A5 price snapshot;
  - records the Payments-owned receipt inside the same DB transaction;
  - consumes all sale lines through Inventory-owned `InventoryPosService` and preserves FIFO cost lineage;
  - CAS-transitions the POS sale from `draft` to `committed`;
  - emits `pos.sale.committed.v1` only after all authoritative boundaries succeed.
- `src/modules/finance/application/finance-cross-domain.consumer.ts`
  - consumes `pos.sale.committed.v1`;
  - records a Finance-owned immutable/idempotent financial fact;
  - does not rewrite POS or Payments state.

## Ownership and integrity
- POS owns physical-sale orchestration and commit state only.
- Payments owns the authoritative receipt fact; POS does not call the online/order-bound `PaymentService` and cannot fabricate an online paid/refunded lifecycle.
- Inventory owns stock mutation, availability and FIFO cost lineage.
- Finance owns derived financial facts; POS does not write Finance tables directly.
- The full commit path is one server-side transaction. If payment receipt confirmation, stock consumption, cost lineage, or final CAS fails, the transaction rolls back.
- A committed sale cannot be produced without a valid priced sale, staff actor, payment receipt, warehouse, and COGS evidence.
- Financial values remain integer Toman; `revenue_toman - cogs_toman = gross_profit_toman` is database constrained.

## Persistence
Forward-only migration: `0051_pos_commit_payment_finance.sql`. Existing migrations are unchanged.

## Verification evidence
PR: `#49`  
Implementation head after assertion correction: `0de869409df81b9d9bec303abdbd6843ad9b9ea8`  
Canonical implementation CI run: `32539808847`  
Job: `verify` (`96947463346`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 426 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A6 dedicated tests: **6/6 PASS**;
- Runtime tests: **399 PASS / 0 FAIL / 0 skipped / 0 cancelled**;
- Overall verification: PASS.

The first A6 CI run (`32539696690`) reached 397/399 PASS and exposed two test-assertion defects only: a synchronous staff guard was incorrectly asserted with `assert.rejects`, and a substring assertion mistook `PhysicalSalePaymentService` for the generic `PaymentService`. Both assertions were corrected without deleting or disabling tests; production code required no bypass to make the gate pass.

The exact final documentation/current-state head must also pass Canonical CI before PR #49 is merged to `main`.

## Next safe action
Proceed to **Step 49 / A7 — Offline Command Queue + Idempotent Sync** only after exact final-head CI PASS and merge of PR #49.
