# EQCOFE Step 49 / A2 — POS Domain + Physical Sale Transaction Model

**Step:** 49 — Physical Store / POS Backend  
**Substep:** A2 — POS Domain + Physical Sale Transaction Model  
**Date:** 2026-08-21  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A2 establishes the first real POS implementation inside the pre-existing `src/modules/pos` shell. It is intentionally limited to physical-sale transaction identity, draft/void lifecycle, bounded variant lines, idempotent creation identity and forward-only persistence. Barcode resolution, Pricing snapshots, Inventory consumption/reserve enforcement, Payments/Finance integration, offline sync, reconciliation and HTTP/RBAC surfaces remain deferred to later Step-49 substeps.

## Implementation
- `src/modules/pos/domain/physical-sale.ts`
  - UUID-bound physical-sale identity;
  - stable client command identity;
  - staff actor identity;
  - `draft | voided` lifecycle only;
  - positive integer quantity bounds `1..999`;
  - duplicate variant lines converge by quantity;
  - void is terminal for editing and idempotent for repeated void.
- `database/migrations/0049_pos_physical_sales.sql`
  - creates `pos` schema if needed;
  - creates `pos.physical_sales` and `pos.physical_sale_lines`;
  - `client_command_id` is unique for idempotent sale creation;
  - line uniqueness is `(sale_id, variant_id)`;
  - no price, stock, payment or finance authority is copied into POS persistence.
- `src/modules/pos/infrastructure/physical-sale.repository.ts`
  - idempotent create;
  - row-lock reads for serialized mutation;
  - bounded line upsert;
  - compare/version-safe draft void primitive.
- `src/modules/pos/application/physical-sale.service.ts`
  - transaction-managed draft creation;
  - idempotent replay by client command;
  - staff ownership check on line mutation;
  - draft-only line mutation.
- `src/modules/pos/pos.module.ts`
  - registers/exports `PhysicalSaleService`.
- `test/pos-physical-sale-a2.spec.ts`
  - 6 focused A2 domain/persistence/ownership regression tests.

## Ownership / safety
- Catalog remains authoritative for variant/SKU facts; A2 stores only a variant UUID reference and does not validate barcode/SKU yet.
- Pricing remains authoritative; A2 stores no unit price, total, discount or pricing rule.
- Inventory remains authoritative; A2 stores no stock balance, availability, reservation or consumption state.
- Payments and Finance remain authoritative; A2 creates no paid/refunded/financial outcome.
- No POS HTTP controller is introduced.
- No new dependency is introduced.
- Existing migrations are not rewritten.

## CI correction
The first Canonical CI run `32489615477` failed TypeScript because a derived domain line was possibly undefined. The service was corrected with an explicit fail-closed guard; no test was removed or disabled.

## Verification evidence
PR: `#45`  
Implementation head: `ba9596ffa5e323a429c5c5b86aaddcad49e21157`  
Canonical CI run: `32489717156`  
Job: `verify` (`96794265716`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 418 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A2 dedicated tests: 6/6 PASS;
- Runtime tests: 376 PASS / 0 FAIL / 0 skipped / 0 cancelled;
- Overall verification: PASS.

A2 is canonical only after this documentation head also passes Canonical CI and PR #45 is merged to `main`.

## Next safe action
Proceed to **Step 49 / A3 — Barcode / SKU Resolution Boundary** after final-head CI PASS and merge.
