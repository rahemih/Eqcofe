# EQCOFE Step 49 / A9 — POS RBAC / Admin Operations / Audit + API Contract

**Step:** 49 — Physical Store / POS Backend  
**Substep:** A9 — POS RBAC / Admin Operations / Audit + API Contract  
**Date:** 2026-08-22  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A9 exposes the previously deferred POS HTTP boundary without changing the authoritative ownership frozen in A1–A8. It adds additive POS RBAC permissions, staff-only routes, idempotent mutation contracts, step-up-protected reconciliation, central audit evidence, and a strict Step-49 POS API contract.

## Implementation
- `database/migrations/0054_pos_rbac_audit_api.sql`
  - additive permissions `pos.view`, `pos.sell`, `pos.reconcile`;
  - valid canonical risk levels (`normal`, `sensitive`).
- `src/modules/pos/presentation/pos-admin.controller.ts`
  - staff-only `/admin/pos` surface;
  - scan, sale create/line/price/commit, offline capture/sync, reconciliation list/inspect/retry/abandon;
  - all routes permission guarded;
  - mutations require canonical idempotency; reconciliation retry/abandon also require step-up.
- `src/modules/pos/application/pos-operations.service.ts`
  - delegates exclusively to existing A2–A7 application boundaries;
  - records safe central audit metadata and does not duplicate Pricing/Inventory/Payments/Finance authority.
- `src/modules/pos/application/pos-admin-reconciliation.service.ts`
  - permits explicitly authorized cross-staff reconciliation administration;
  - keeps original command owner unchanged;
  - retry only requeues and reports `requires_owner_sync: true`;
  - retry/abandon records central audit in the same reconciliation transaction.
- `src/modules/pos/infrastructure/offline-command.repository.ts`
  - adds admin list/retry/abandon variants while reusing immutable A8 history and bounded retry rules;
  - never rewrites payload or historical line effects.
- `contracts/http/step49-pos-a9.yaml`
  - strict A9 POS HTTP contract;
  - offline payload is allow-listed and cannot carry price, stock, COGS, paid-state or total authority.

## Security / ownership
- Staff authentication is mandatory for all POS routes.
- `pos.view` is read-only scanner visibility; `pos.sell` gates sale/offline mutations; `pos.reconcile` gates cross-staff reconciliation visibility and actions.
- Reconciliation retry/abandon require both Step-Up and Idempotency.
- Cross-staff admin recovery never changes `staff_actor_id`; server-authoritative owner sync remains required.
- Catalog, Pricing, Inventory, Payments and Finance remain authoritative in their existing bounded contexts.
- Audit entries contain bounded operational metadata rather than raw offline payloads or secrets.

## Regression correction
The first A9 CI run (`32553653049`) failed one closed-A2 assertion that assumed POS would never have a controller. A2 had intentionally deferred HTTP to later Step-49 work; A9 is that planned boundary. The assertion was minimally updated to preserve the true A2 invariant (original A2 persistence remains free of barcode/payment/price/inventory authority) while requiring the later A9 controller to be Staff/RBAC protected. No test was removed or disabled.

## Verification evidence
Implementation head: `e23cac78cd3e540cdc39fd2d00fba789cd15e75b`  
Canonical implementation CI run: `32553710252`  
Job: `verify` (`96984484978`) — PASS

- OpenAPI canonical root validation: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 432 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A9 focused tests: **7/7 PASS**
- Runtime tests: **420 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

The exact documentation/current-state head must also pass Canonical CI before PR #52 is merged.

## Next safe action
Proceed to **Step 49 / A10 — Security / Concurrency / E2E Regression Gate** only after the final A9 head passes Canonical CI and PR #52 is merged to `main`.
