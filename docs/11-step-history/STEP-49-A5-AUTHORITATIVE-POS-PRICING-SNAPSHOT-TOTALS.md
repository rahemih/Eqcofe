# EQCOFE Step 49 / A5 — Authoritative POS Pricing Snapshot / Sale Totals

**Step:** 49 — Physical Store / POS Backend  
**Substep:** A5 — Authoritative POS Pricing Snapshot / Sale Totals  
**Date:** 2026-08-21  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A5 makes canonical Pricing the only authority for POS line prices and stores an explicit integer-Toman pricing snapshot on the physical-sale line. POS does not implement a parallel pricing engine.

## Implementation
- `database/migrations/0050_pos_pricing_snapshot.sql`
  - adds line-level base/discount/unit-price Toman snapshot fields;
  - records canonical Pricing base-price identity, applied rule ids, customer type and priced timestamp;
  - adds sale subtotal/discount/total fields with database identity `subtotal - discount = total`.
- `src/modules/pos/application/pos-pricing-snapshot.service.ts`
  - validates sale/staff identity and draft state;
  - snapshots current line fingerprint;
  - quotes every variant through canonical `PricingQueryService.quoteVariant()`;
  - fails closed when no authoritative quote exists or Toman arithmetic is inconsistent;
  - re-locks sale/lines before persistence and rejects concurrent line changes;
  - persists line snapshots and deterministic sale totals in one transaction.
- `PhysicalSaleRepository` stores snapshots/totals and invalidates a line pricing snapshot whenever quantity is increased.
- `PosModule` imports `PricingModule`; there is no POS-side PricingEngine or direct Pricing persistence query.

## Ownership / security
- Pricing remains authoritative for base price, price rules, quantity pricing and profit guard.
- POS owns only the sale-time commercial snapshot required for physical-sale continuity/audit.
- all money remains integer Toman.
- missing/inconsistent/non-integer pricing fails closed.
- line mutation invalidates the prior price snapshot so stale totals cannot be treated as current.
- no Payments, Finance, offline sync, reconciliation, Inventory mutation change or POS HTTP/RBAC surface is introduced.

## Verification evidence
PR: `#48`  
Implementation head: `5f5200345680a128076e6162bcc62f290e0f88d5`  
Canonical CI run: `32492397111`  
Job: `verify` (`96802866226`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 424 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A5 dedicated tests: 6/6 PASS;
- Runtime tests: 393 PASS / 0 FAIL / 0 skipped / 0 cancelled;
- Overall verification: PASS.

The exact final documentation head must also pass Canonical CI before PR #48 is merged to `main`.

## Next safe action
Proceed to **Step 49 / A6** only after exact final-head CI PASS and merge of PR #48.
