# EQCOFE — Step 46 / A9

## Customer Club / Points MVP Foundation

**Status:** IMPLEMENTED / CI VERIFICATION PENDING

## Scope
A9 implements the minimal Customer Club points foundation inside the existing `loyalty` bounded context. Points remain non-cash units and are never Toman, Wallet balance, stored value, transferable value, withdrawable value, or a payment instrument.

## Domain model
The immutable ledger supports:
- `earn` — positive points;
- `redeem` — negative points, only when sufficient balance exists;
- `expire` — negative points, only when sufficient balance exists;
- `adjust` — explicit positive/negative correction while preserving non-negative final balance;
- `reverse` — exact compensating entry for one previous non-reversal entry.

Balance is always derived as the sum of immutable ledger deltas. It is not a separately mutable source of truth.

## Persistence and concurrency
Migration `0041_loyalty_points_mvp_foundation.sql`:
- extends the A3 ledger with explicit reversal lineage;
- guarantees one reversal per original ledger entry;
- requires exact opposite delta for a reversal;
- serializes all customer point mutations with a PostgreSQL transaction advisory lock;
- rejects any write that would make balance negative;
- makes ledger rows append-only by rejecting UPDATE/DELETE;
- preserves reference-based idempotency from A3.

## Application foundation
`PointsService` and `PointsRepository` provide:
- balance read;
- bounded history read;
- earn/redeem/expire/adjust commands;
- exact reversal command;
- inactive/anonymized/unknown customer fail-closed behavior;
- idempotent same-reference replay when the stored delta matches.

No HTTP/Admin API is claimed in A9; that remains A10.

## Deliberately not invented
There is no canonical business rule yet that defines a Toman-to-points earning rate, order amount conversion, tier multiplier, or points-to-discount monetary exchange. A9 therefore does **not** invent an automatic order-to-points conversion trigger. Such a policy must be explicitly approved before wiring automatic earning.

## No-Wallet boundary
A9 contains no wallet, cash conversion, withdrawal, transfer, Toman balance, or payment semantics. The existing domain `toToman()` path remains fail-closed.

## Verification coverage
`test/loyalty-step46-a9.spec.ts` covers non-cash semantics, all MVP ledger entry types, exact reversal, negative-balance concurrency protection, append-only persistence, reversal uniqueness, derived balance, idempotency, active-customer enforcement, and the prohibition on invented monetary conversion policy.

## Closure gate
A9 becomes COMPLETE only after Canonical CI passes against the exact A9 source.

## Next substep after closure
**Step 46 / A10 — Admin API + RBAC + Audit + Idempotency**
