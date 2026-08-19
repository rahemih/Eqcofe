# EQCOFE — Step 46 / A9

## Customer Club / Points MVP Foundation

**Status:** COMPLETE / FINAL GATE PASS

## Scope
A9 implements the minimal Customer Club points foundation inside the existing `loyalty` bounded context. Points remain non-cash units and are never Toman, Wallet balance, stored value, transferable value, withdrawable value, or a payment instrument.

## Domain model
The immutable ledger supports `earn`, `redeem`, `expire`, `adjust`, and exact compensating `reverse` entries. Balance is always derived from immutable ledger deltas and cannot become negative.

## Persistence and concurrency
Migration `0041_loyalty_points_mvp_foundation.sql` adds explicit reversal lineage, one-reversal-per-entry enforcement, exact opposite reversal delta, customer-scoped PostgreSQL advisory locking, negative-balance protection, append-only UPDATE/DELETE rejection, and retained reference idempotency.

## Application foundation
`PointsService` and `PointsRepository` provide balance/history reads and earn/redeem/expire/adjust/reverse commands with active-customer fail-closed behavior and same-reference idempotent replay.

No HTTP/Admin API is claimed in A9; that remains A10.

## Deliberately not invented
There is no canonical approved Toman-to-points earning rate, order amount conversion, tier multiplier, or points-to-discount monetary exchange. A9 therefore does not invent automatic order-to-points conversion. This preserves the no-Wallet boundary and prevents an unsupported monetary rule from entering canonical code.

## Canonical CI verification
Verification-only Draft PR #14 tested the exact A9 production source already present on `main`; its branch added only a CI marker and must not be merged.

Final GitHub Actions Canonical CI run `32262486061`, job `verify` (`96098810744`) passed:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 513 paths / 582 operations / 1138 refs
- architecture: PASS — 364 module files scanned
- project policy: PASS
- TypeScript build: PASS
- A9 tests: **10/10 PASS**
- runtime tests: **194 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

Therefore:
**STEP 46 / A9 FINAL GATE = PASS**
**A9 = COMPLETE**

## Next approved substep
**Step 46 / A10 — Admin API + RBAC + Audit + Idempotency**
