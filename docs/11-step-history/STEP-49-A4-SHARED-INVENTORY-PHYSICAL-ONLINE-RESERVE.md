# EQCOFE Step 49 / A4 — Shared Inventory Consumption + Physical/Online Reserve Enforcement

**Step:** 49 — Physical Store / POS Backend  
**Substep:** A4 — Shared Inventory Consumption + Physical/Online Reserve Enforcement  
**Date:** 2026-08-21  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A4 establishes the canonical Inventory-owned physical-sale consumption boundary and proves that online reservation continues to honor the existing physical-protection rule. POS does not create or own a second stock ledger.

## Implementation
- `src/modules/inventory/application/inventory-pos.service.ts`
  - validates bounded POS identifiers/quantity;
  - locks the canonical Inventory stock balance;
  - computes physical free stock excluding reserved, allocated, damaged and quarantine buckets;
  - fails closed when physical free stock is insufficient;
  - consumes canonical sellable FIFO cost layers;
  - records append-only inventory movements and cost-layer consumptions;
  - decrements `inventory.stock_balances.on_hand` atomically;
  - returns factual Inventory cost lineage only, without Finance authority.
- `InventoryModule` exports `InventoryPosService`.
- `src/modules/pos/application/pos-inventory-consumption.service.ts` delegates to Inventory and contains no direct inventory SQL.
- `PosModule` imports `InventoryModule` and exports the delegation service.

## Shared reserve rule
Existing Inventory online reservation remains canonical and uses `onlineSellable()`, which subtracts the configured physical-protection quantity before admitting online reservations. Physical POS consumption uses `physicalAvailable()`, so it may consume free physical stock but can never consume reserved, allocated, damaged or quarantined quantities.

The default warehouse protection rule remains the existing 20% unless changed through the pre-existing Inventory warehouse control. A4 does not invent a second percentage or override.

## Persistence
No migration is required. A4 reuses the canonical Inventory schema from `0008_inventory_engine.sql`:
- row-locked `inventory.stock_balances`;
- FIFO `inventory.cost_layers`;
- append-only `inventory.movements`;
- immutable cost consumption lineage.

## Security / ownership
- Inventory remains the only stock authority.
- POS cannot directly mutate `stock_balances`, cost layers, reservations or allocations.
- physical sale consumption cannot consume online reservations or allocated stock.
- online reservation cannot consume the configured physical-protection share.
- FIFO lineage fails closed if cost layers cannot satisfy the requested quantity.
- no Pricing, Payments, Finance, offline sync, reconciliation or POS HTTP/RBAC surface is introduced.

## Verification evidence
PR: `#47`  
Implementation head: `f0063290a4abd579ebcbc43c7f939b0dc3207525`  
Canonical CI run: `32491439781`  
Job: `verify` (`96799787271`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 423 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A4 dedicated tests: 6/6 PASS;
- Runtime tests: 387 PASS / 0 FAIL / 0 skipped / 0 cancelled;
- Overall verification: PASS.

The exact final documentation head must also pass Canonical CI before PR #47 is merged to `main`.

## Next safe action
Proceed to **Step 49 / A5 — Authoritative POS Pricing Snapshot / Sale Totals** only after exact final-head CI PASS and merge of PR #47.
