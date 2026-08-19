# EQCOFE Step 38 — Payment Engine Audit

## Result
Step 38 payment core is complete with no known intrinsic defect in the implemented scope. Live gateway activation remains fail-closed until a provider-specific adapter and credentials are configured.

## Implemented
- Payment intent lifecycle: initiating → pending → paid/failed/unknown/late_received/refund_required/refunded.
- Amount is sourced exclusively from the immutable order snapshot; DB deferred invariant enforces payment amount == order total.
- External provider calls are outside DB transactions; unknown outcomes are fail-closed and scheduled for reconciliation.
- Provider reconciliation contract supports recovery by payment id even when authority persistence was interrupted.
- Guest and customer payment access are separated; guest access uses X-Checkout-Token with an independent guest-order TTL.
- Provider callback is separate from customer/guest verify routes.
- Raw request body is retained for provider webhook signature verification/fingerprinting.
- Webhook inbox supports deduplication, payload-conflict detection, retry after failed/received states, and concurrent insert safety.
- Payment success converts inventory commitment before atomic payment+order confirmation; conversion and late-review operations are idempotent for crash recovery.
- Expired-order late payments attempt atomic stock reacquisition; unavailable stock produces refund_required and an automatic compensating refund request.
- Cancelled-order late payment also becomes refund_required rather than confirming a cancelled order.
- Refund workflow: requested → approved → processing → succeeded/failed/unknown/rejected/cancelled; retries reuse the same refund id as provider idempotency identity.
- Deferred DB refund-cap invariant prevents active/succeeded refund total from exceeding the original payment.
- Order payment projection supports unpaid/pending/paid/partially_refunded/refund_required/refunded.
- Scheduler reconciliation runs every 10 minutes.
- Payment/refund RBAC permissions, step-up and idempotency metadata are present.
- Versioned payment/order/refund event schemas are present.

## Audit
- Architecture: PASS
- Toman / no-wallet policy: PASS
- OpenAPI: 504 paths / 572 operations
- Duplicate operationId: 0
- Broken local refs: 0
- Payment/refund controller ↔ OpenAPI drift: 0
- Broken relative imports: 0
- Event JSON parse failures: 0
- Step 38 payment assertions: 28/28 PASS
- TypeScript syntax TS1xxx errors: 0
- Changed-scope intrinsic errors: 0 (remaining compiler errors are missing installed dependencies/@types in this environment)
- Stale dist/: absent

## Explicit external gates
1. `pnpm install` + Node 24 full NestJS build/test is not runnable in this environment.
2. Migration `0012_payment_engine.sql` must be exercised on PostgreSQL 18 with lock/concurrency tests.
3. Live gateway is intentionally disabled by default. A provider-specific adapter (e.g. selected Iranian PSP) plus merchant credentials must be configured before `PAYMENTS_ENABLED=true` is used in production.
4. Provider-specific refund semantics must be verified against the selected PSP; unsupported refund APIs remain fail-closed.

These gates do not permit fabricated payment success.
