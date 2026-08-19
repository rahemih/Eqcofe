# EQCOFE Step 41 — A9 Cross-domain Financial Integration

**Status: VERIFIED / PASS (environment-limited full dependency build)**

Baseline: Step 41 A8 verified/executed artifact.

## Implemented
- `FinanceCrossDomainConsumer` registered through the existing `EventConsumerRegistry` / consumer inbox path.
- Finance reacts to authoritative Order, Payment, Inventory, Returns and Procurement events without taking ownership of source-domain state.
- Critical financial source events trigger profit recalculation inside the same consumer transaction.
- Post-final financial mutations (`payment.*refund*`, inventory return, return resolution, landed-cost finalization) reverse the current final distribution immutably before recalculation.
- Order resolution supports direct `order_id`, `order_item_id`, `return_id`, and landed-cost → receipt item → cost layer → consumption → order lineage.
- Existing public `calculate()` / `reverse()` APIs are preserved; new in-transaction variants prevent nested transaction drift in event processing.
- Worker imports `FinanceModule`, so the consumer is active in the domain-event worker.
- No source-domain UPDATE/DELETE is performed by Finance integration.
- No new database migration is required; idempotency uses the existing `events.consumer_inbox` transaction boundary.

## Verification
- A9 static audit: 32/32 PASS
- A9 core tests: 5/5 PASS
- TypeScript syntax-only transpile of all changed TS files: PASS
- A8 audit: 34/34 PASS
- A7 audit: 35/35 PASS
- A6 audit: 34/34 PASS
- A5 audit: 30/30 PASS
- A4 audit: 30/30 PASS
- Finance core tests A4–A9: PASS
- Architecture check: PASS (290 files scanned)
- Project policy check: PASS (`toman-no-wallet-config-boundary`)

## Environment limitation
The container has Node 22.16.0 while the project requires Node >=24.18.1 <25, and `pnpm`/project dependencies are not installed. Full dependency-backed TypeScript build cannot be repeated in this environment. The direct `tsc` attempt fails on missing external packages/types throughout the pre-existing project, not on A9-specific syntax. A9 changed files pass TypeScript compiler syntax transpilation independently.

## Next
A10 — Admin Finance HTTP Contracts + RBAC / Step-Up / Idempotency.
