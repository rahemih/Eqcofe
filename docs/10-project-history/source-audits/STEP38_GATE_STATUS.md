# EQCOFE Step 38 — Gate Status

Updated: 2026-08-13

## Canonical internal baseline

Step 38 Payment Engine is internally hardened and reproducible from this artifact. Live payments remain fail-closed until every external gate below is proven in the target environment.

Verified again during recovery:

- `src/modules/payments/tests/payment.engine.test.mjs`: 62/62 PASS.
- `scripts/step38-financial-audit.py`: PASS.
- `scripts/step38-cycle-audit.py` cycles 1 through 10: PASS.
- `scripts/check-architecture.mjs`: PASS.
- `scripts/check-project-policies.mjs`: PASS.
- OpenAPI financial audit: 505 paths / 573 operations; local refs validated by the financial audit.

## External gates still OPEN

1. **Node 24 dependency-backed build/test**
   - Required project runtime: Node `24.18.1` (engine allows `>=24.18.1 <25`).
   - Run Corepack + pnpm `11.21.0`, install dependencies, generate/freeze the lockfile as appropriate, then run contract validation/types, build, test, architecture and policy checks.
   - Recovery sandbox has Node 22 only and blocks package/network downloads, therefore this gate is not marked PASS.

2. **PostgreSQL 18 migration and concurrency execution**
   - Apply migrations through `0013_payment_financial_hardening.sql` on PostgreSQL 18.
   - Run separate-connection tests for concurrent successful payments, duplicate callbacks/webhooks, refund-cap races, refund process/reconcile races, deadlocks, rollback/crash recovery, and idempotency replay.
   - Recovery sandbox has no PostgreSQL client/server or container runtime; no EQCOFE Neon project exists yet, therefore this gate is not marked PASS.

3. **Production Iranian PSP selection and adapter integration**
   - Owner/provider selection is still required.
   - Merchant secrets must remain outside source control.
   - `PAYMENTS_ENABLED` must remain false until sandbox/contract verification passes.

4. **Provider-specific refund/callback/reconciliation verification**
   - Verify signature/authenticity, callback behavior, server-side verification, unknown outcomes, refund idempotency, reconciliation semantics and evidence mapping in the selected PSP sandbox.

## Activation rule

Step 38 must not be declared fully complete and production payments must not be enabled until all four external gates are evidenced as PASS and a final regression is completed from the exact deployed source revision.
