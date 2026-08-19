# EQCOFE Step 38 — Financial/Security Hardened Audit

## Baseline recovery
The only source artifact that was fully verifiable at recovery time was `eqcofe-backend-step38-final.zip`. Hardening steps that had only been described in chat after that artifact were treated as incomplete and reimplemented on a fresh working copy.

## Hardenings implemented
- Refund `processing/unknown` can no longer be cancelled; only requested/approved/definitively-failed refunds can release their reserved refund capacity.
- Refund cap is serialized by locking the parent payment row; failed refunds continue reserving capacity until retried or explicitly cancelled.
- Independent refund reconciliation with bounded backoff, attempt cap, and manual-review escalation.
- Separation of duties for refund creation/approval; sensitive refund operations require Step-Up + Idempotency and write audit records.
- Provider reference is claimed before Inventory/Order side effects; duplicate provider references fail closed.
- Payment provider registry resolves the provider from the immutable `provider_key` snapshot instead of a single injected provider.
- Browser callback uses a random one-time state; only its SHA-256 hash is stored.
- Webhooks require real raw body and never trust callback status; after webhook authenticity parsing the server performs provider-side verification against the stored amount.
- Provider verified amount mismatch is fail-closed and escalated to manual review.
- Provider redirect URLs are allowlisted; production payments require a redirect-host allowlist and HTTPS callback.
- Payment and Refund provider-check leases prevent concurrent provider verification/refund reconciliation; leases are crash-recoverable.
- Reconciliation uses bounded retries/backoff and stops in manual review instead of retrying forever.
- Double-charge / late-resurrection protection: the first successful payment claims `orders.settlement_payment_id`; later successful payments for the same order become compensating refunds without changing fulfillment.
- Old failed payment attempts cannot clear or overwrite a newer payment projection or final settlement.
- Late-payment auto-refund is only triggered for deterministic business stock failures; technical failures remain reconciliation/manual-review cases.
- Automatic compensating refunds use distinct immutable reason codes: `cancelled_order_payment`, `duplicate_order_payment`, `late_payment_stock_unavailable`.
- Non-settlement refunds cannot overwrite the settled order's payment projection.
- Sensitive provider exception messages are not persisted/exposed through payment attempts.
- Financial event contracts were expanded for refund requested/completed/failed and payment partial/full refund events; producer/schema drift found during review was corrected.
- Manual-review admin reconciliation is a valid recovery path; automatic scheduler processing skips manual-review records.
- Legacy in-flight uniqueness was narrowed so late resurrection can coexist with a later in-flight attempt and be resolved by settlement ownership instead of failing on a DB unique index.

## Final 10 consecutive clean cycles
After the last source change, ten consecutive review cycles were run. The 10th cycle initially timed out at tool level before completion; it was discarded and rerun from the beginning. The completed retry passed.

Each cycle ran:
- `src/modules/payments/tests/payment.engine.test.mjs` — 62/62 assertions PASS
- `scripts/step38-financial-audit.py` — PASS
- `scripts/check-architecture.mjs` — PASS
- `scripts/check-project-policies.mjs` — PASS
- One cycle-specific deep audit target

Cycle targets:
1. Financial state/invariants — PASS
2. Security/callback/webhook — PASS
3. Concurrency/idempotency — PASS
4. Refund integrity — PASS
5. Provider/reconciliation — PASS
6. Order/Inventory integration — PASS
7. OpenAPI/HTTP semantics — PASS
8. Events/forensics/PII — PASS
9. DI/config/scheduler — PASS
10. Full regression — PASS

## Final measured results
- Hardened payment assertions: **62/62 PASS**
- Architecture: **PASS** (220 files scanned)
- Toman / No-Wallet / config-boundary policy: **PASS**
- OpenAPI paths: **505**
- OpenAPI operations: **573**
- Local OpenAPI refs checked: **1084**
- Broken local refs: **0**
- Event JSON schemas: **15**, all parse/schema checks PASS
- Payment controller routes missing from OpenAPI: **0**
- Payment OpenAPI routes without controller: **0**
- Changed-scope intrinsic TypeScript errors (excluding unavailable dependency typings): **0**
- Stale `dist/`: **0**
- Temporary payment migration artifact: **0**

## Explicit environment/production gates — not falsely marked PASS
These are still required before production certification:
1. Install dependencies and run the full build/test suite on the repository's target Node 24 runtime (`pnpm install`, `pnpm build`, full `pnpm test`). The current environment lacks the project's node_modules and runs Node 22.
2. Execute migrations `0012_payment_engine.sql` and `0013_payment_financial_hardening.sql` on real PostgreSQL 18 and run true concurrent-transaction tests (refund write-skew, settlement races, provider-reference races, advisory/row locks, deferred constraints).
3. Configure and test a real PSP adapter in sandbox/staging. The current `ConfiguredPaymentProvider` is intentionally fail-closed and does not simulate a successful real payment.
4. Run end-to-end callback/webhook/refund/reconciliation tests against the selected PSP using its real signature/verification semantics.

## Result
Within the source/static/domain-contract scope that is executable in this environment, Step 38 reached ten consecutive clean review cycles after the last code change. No known source-level financial/security defect remains in that audited scope. Production readiness is intentionally withheld until the four environment/PSP gates above pass.
