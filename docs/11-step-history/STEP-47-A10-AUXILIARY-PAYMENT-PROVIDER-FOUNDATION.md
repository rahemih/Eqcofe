# EQCOFE — Step 47 / A10

## Auxiliary Payment Provider Foundation

**Status:** COMPLETE / FINAL GATE PASS

A10 adds a provider-agnostic `payment_aux` integration surface for non-authoritative payment inquiries and auxiliary commands. It does not replace or bypass the Payments bounded context, its `PaymentProvider` contract, ZarinPal integration, reconciliation, refund logic, or payment-state transitions.

## Ownership
- Payments remains authoritative for initiate/verify/reconcile/refund/webhook handling and all `PaymentStatus` transitions.
- Integrations owns only external `payment_aux` configuration, secret resolution, resilient transport and normalized observations.
- An auxiliary observation can be `accepted`, `rejected`, `pending`, or `unknown`; none of these values means `paid` or `refunded`.

## Runtime
`PaymentAuxProviderService` provides configured inquiry reads, configured auxiliary commands with mandatory idempotency, shared timeout/retry/circuit-breaker behavior through `ProviderHttpClient`, fail-closed provider/configuration/JSON/timestamp validation, and vendor-neutral observations.

## Safety invariants
- provider kind must be `payment_aux`;
- no payment vendor is hard-coded;
- secret values remain behind `ProviderConfigurationService`;
- write retries require an idempotency key;
- Integrations never imports Payment persistence or mutates payment state;
- provider observations are advisory/non-authoritative until Payments explicitly reconciles through its own rules.

## Verification evidence
Canonical CI run `32474146181`, job `verify` (`96746902886`) passed on PR #31 implementation source:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 402 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A10 dedicated tests: **8/8 PASS**
- runtime tests: **308 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

## Next approved substep
**Step 47 / A11 — Security + Failure + Concurrency + E2E Regression**
