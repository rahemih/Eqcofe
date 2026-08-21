# EQCOFE — Step 47 / A10

## Auxiliary Payment Provider Foundation

**Status:** IMPLEMENTED / VERIFICATION PENDING

A10 adds a provider-agnostic `payment_aux` integration surface for non-authoritative payment inquiries and auxiliary commands. It does not replace or bypass the Payments bounded context, its `PaymentProvider` contract, ZarinPal integration, reconciliation, refund logic, or payment-state transitions.

## Ownership
- Payments remains authoritative for initiate/verify/reconcile/refund/webhook handling and all `PaymentStatus` transitions.
- Integrations owns only external `payment_aux` configuration, secret resolution, resilient transport and normalized observations.
- An auxiliary observation can be `accepted`, `rejected`, `pending`, or `unknown`; none of these values means `paid` or `refunded`.

## Runtime
`PaymentAuxProviderService` provides:
- configured inquiry reads;
- configured auxiliary commands with mandatory idempotency;
- shared timeout/retry/circuit-breaker behavior through `ProviderHttpClient`;
- fail-closed provider-kind/configuration/JSON/timestamp validation;
- vendor-neutral response observations.

## Safety invariants
- provider kind must be `payment_aux`;
- no payment vendor is hard-coded;
- secret values remain behind `ProviderConfigurationService`;
- write retries require an idempotency key;
- Integrations never imports Payment persistence or mutates payment state;
- provider observations are advisory/non-authoritative until Payments explicitly reconciles through its own rules.

## Verification
A10 becomes COMPLETE only after Canonical CI passes on the exact implementation source.

## Next approved substep
**Step 47 / A11 — Security + Failure + Concurrency + E2E Regression**
