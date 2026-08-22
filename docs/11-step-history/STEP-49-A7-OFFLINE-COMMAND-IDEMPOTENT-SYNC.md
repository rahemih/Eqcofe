# EQCOFE Step 49 / A7 — Offline Command Queue + Idempotent Sync

**Step:** 49 — Physical Store / POS Backend  
**Substep:** A7 — Offline Command Queue + Idempotent Sync  
**Date:** 2026-08-22  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A7 adds POS-originated offline sale-intent capture and idempotent reconnect synchronization. Offline state is not an authoritative store database and cannot override server-side Pricing, Inventory, Payments or Finance rules.

## Implementation
- `database/migrations/0052_pos_offline_command_sync.sql`
  - creates `pos.offline_commands` with stable `client_command_id`, deterministic payload hash and terminal `applied` / `failed` evidence;
  - creates `pos.offline_command_line_effects` for replay-safe per-line application;
  - keeps migration forward-only.
- `src/modules/pos/infrastructure/offline-command.repository.ts`
  - owns command persistence and state transitions;
  - uses transaction-scoped advisory locking for per-command line identities;
  - records immutable line-effect identity so reconnect replay cannot increment quantity twice.
- `src/modules/pos/application/offline-command-sync.service.ts`
  - accepts only `sale.sync` intent;
  - requires authenticated staff ownership;
  - normalizes/allow-lists warehouse, customer type, payment method, external reference and variant quantities;
  - rejects unknown payload/line fields so offline clients cannot inject authoritative price, stock, COGS or payment-state facts;
  - creates/replays the physical sale through `PhysicalSaleService`;
  - applies each line once using stable line-effect markers;
  - re-prices through canonical `PosPricingSnapshotService` at reconnect time;
  - commits through canonical A6 `PhysicalSaleCommitService`, therefore Inventory/Payments remain authoritative;
  - records sync failure for A8 reconciliation instead of silently retrying or rewriting history.

## Idempotency and server authority
- Command identity is unique and payload-bound by SHA-256 hash.
- Reusing a command identity with a different actor/type/payload fails closed.
- Duplicate variant lines are normalized and bounded before persistence.
- Replayed line effects do not double-increment physical sale quantity.
- If a command is already applied, sync returns the persisted command result without re-running effects.
- If a command is failed, A7 does not auto-replay it; recovery/reconciliation remains A8 scope.
- Stale offline price/stock facts are never accepted because they are not part of the accepted payload; reconnect pricing and commit execute against current server-owned state.

## Verification evidence
PR: `#50`  
Implementation head after strict-typing correction: `f6b1b56832e599bc207ded848f669a4d009cbf72`  
Canonical implementation CI run: `32551013775`  
Job: `verify` (`96977621374`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 428 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A7 dedicated tests: **7/7 PASS**;
- Runtime tests: **406 PASS / 0 FAIL / 0 skipped / 0 cancelled**;
- Overall verification: PASS.

The first A7 CI run (`32550957197`) stopped at TypeScript build because strict indexed access treated `payload.lines[i]` as possibly undefined. The loop was changed to typed `entries()` iteration. No test was deleted/disabled and no production invariant was weakened.

The exact final documentation/current-state head must also pass Canonical CI before PR #50 is merged to `main`.

## Deferred to A8
- operator reconciliation workflow;
- conflict classification/inspection beyond persisted failure code;
- explicit recovery/retry/abandon controls;
- reconciliation read models and recovery audit surface.

## Next safe action
Proceed to **Step 49 / A8 — Reconciliation + Conflict / Recovery Controls** only after exact final-head CI PASS and merge of PR #50.
