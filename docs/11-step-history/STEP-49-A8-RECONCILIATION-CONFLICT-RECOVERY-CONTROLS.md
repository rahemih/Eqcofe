# EQCOFE Step 49 / A8 — Reconciliation + Conflict / Recovery Controls

**Step:** 49 — Physical Store / POS Backend  
**Substep:** A8 — Reconciliation + Conflict / Recovery Controls  
**Date:** 2026-08-22  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A8 adds explicit recovery controls for failed A7 offline commands without allowing destructive history rewriting or offline authority over pricing, stock, payment, or finance facts.

## Implementation
- `database/migrations/0053_pos_offline_reconciliation.sql`
  - extends offline command state with terminal `abandoned`;
  - adds bounded `recovery_count` (0..5);
  - adds `abandoned_at` state evidence;
  - creates append-only `pos.offline_command_reconciliation_history`;
  - database trigger blocks UPDATE/DELETE of reconciliation history.
- `src/modules/pos/infrastructure/offline-command.repository.ts`
  - same-staff failed-command lookup;
  - explicit failed→queued recovery transition with bounded count;
  - explicit failed→abandoned terminal transition;
  - append-only history insertion before state changes;
  - history and failed-list read models;
  - never updates/deletes A7 line effects.
- `src/modules/pos/application/offline-reconciliation.service.ts`
  - staff-only list/inspect;
  - explicit retry with bounded note and maximum five recovery attempts;
  - retry delegates back to canonical `OfflineCommandSyncService`, so current Pricing / Inventory / Payments rules are re-evaluated;
  - explicit abandon is terminal and replay-safe;
  - cross-staff recovery fails closed;
  - applied commands cannot be abandoned and abandoned commands cannot be retried.
- `src/modules/pos/pos.module.ts`
  - registers/exports `OfflineReconciliationService` for later A9 API/RBAC composition.

## Ownership and safety
- A8 does not modify offline payloads or historical line effects.
- A8 does not create offline price, stock, COGS, payment, or finance authority.
- Retry never resumes from a trusted offline commercial snapshot; it executes the A7 canonical sync path again.
- Recovery is explicit; there is no automatic retry loop.
- `abandoned` is terminal and preserves the prior error code.
- Reconciliation history is append-only and records actor, action, prior error, recovery count, optional bounded note, and timestamp.
- A8 remains same-staff/self-owned; cross-user/admin recovery permissions are intentionally deferred to A9 RBAC/API scope.

## Persistence
Forward-only migration: `0053_pos_offline_reconciliation.sql`. Existing migrations are unchanged.

## Verification evidence
PR: `#51`  
Implementation head: `4dbcf5b56159d3598bbbf413bf16aa00143752a7`  
Canonical implementation CI run: `32552910890`  
Job: `verify` (`96982428605`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 429 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A8 dedicated tests: **7/7 PASS**;
- Runtime tests: **413 PASS / 0 FAIL / 0 skipped / 0 cancelled**;
- Overall verification: PASS.

The final documentation/current-state head must also receive Canonical CI PASS before PR #51 is merged to `main`.

## Next safe action
Proceed to **Step 49 / A9 — POS RBAC / Admin Operations / Audit + API Contract** only after exact-head CI passes and PR #51 is merged.
