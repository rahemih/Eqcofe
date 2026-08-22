# EQCOFE — Step 47 / A1

## Discovery + Integration Ownership / Rules Freeze

**Step:** 47 — External Integration Foundation  
**Substep:** A1 — Discovery + Integration Ownership / Rules Freeze  
**Status:** COMPLETE

## 1. Canonical starting state

Step 46 is CLOSED / FINAL GATE PASS. Step 47 is the next approved roadmap step.

Canonical Step-47 scope:
- configurable provider adapters for FX, SMS, email, shipping and auxiliary payment services;
- provider health/status;
- timeout/retry foundations;
- secret/configuration boundaries;
- fail-closed behavior;
- FX preview-before-apply preservation.

## 2. Repository discovery

The canonical repository already contains an explicit integration bounded context:

- `src/modules/integrations`
  - `application/`
  - `domain/`
  - `infrastructure/`
  - `presentation/`
  - `integrations.module.ts`

The module is currently an empty shell (`@Module({})`). Step 47 must implement inside this existing boundary and must not create a parallel integration module.

Relevant existing owner modules discovered:

### Notifications
Step 44 already owns notification orchestration and defines a provider abstraction:
- `NotificationProviderPort`
- `NotificationProviderRegistry`
- channels: `sms | email`
- provider results: `delivered | retryable_failure | permanent_failure | blocked`

Therefore Step 47 must add concrete/provider adapters that implement the existing Notifications port; it must not create a second SMS/email orchestration system.

### Payments
Payments owns payment state, payment/refund correctness and payment-domain decisions. Existing Payments application ports are domain-to-domain ports (for example finance/after-sales), not a generic external-provider foundation.

Step 47 may provide external transport/provider adapter foundations for auxiliary payment integrations, but must not move payment lifecycle ownership out of Payments or invent a competing payment aggregate.

### Fulfillment
Fulfillment owns fulfillment/shipment lifecycle. Step 47 may provide shipping-provider adapters/transport contracts, but shipment state remains owned by Fulfillment.

### Pricing
Pricing remains authoritative for product price mutation and financial pricing rules. FX providers supply rate observations only; they do not directly mutate product prices.

### Configuration
A dedicated `configuration` bounded context already exists. Integration provider selection and non-secret operational settings should integrate with this ownership rather than create an unrelated configuration store.

## 3. Frozen ownership boundaries

### Integrations owns
- common external-provider transport abstractions;
- provider identity/capability metadata;
- timeout/retry policy primitives;
- health probing/status normalization;
- transport error normalization;
- provider adapter implementations where the domain owner exposes an application port;
- FX source adapter contracts and rate observation retrieval;
- provider-safe observability metadata that excludes secrets.

### Integrations does not own
- notification templates, notification business orchestration or delivery lifecycle;
- payment/order/payment-state business decisions;
- shipment/fulfillment lifecycle;
- base product pricing or price mutation;
- customer identity;
- secret values as domain data;
- retrying non-idempotent side effects blindly.

## 4. Secret boundary freeze

1. Secrets must never be committed to Git.
2. Secrets must never be emitted in logs, audit metadata, health responses or application errors.
3. Plaintext secret values must not be persisted in ordinary business tables.
4. Runtime adapters consume secret references/material through environment/secret-provider boundaries.
5. Public/admin configuration may store provider key/name, enablement and non-secret settings, but not raw credentials.
6. Missing/invalid secret material causes fail-closed provider unavailability.

## 5. Timeout / retry / failure rules

1. Every network request must have an explicit finite timeout.
2. Retry policy must be bounded; infinite retries are forbidden.
3. Retry is allowed only when the operation is safe to retry or has an explicit idempotency mechanism.
4. Payment or other side-effecting provider calls must not be retried blindly after an ambiguous timeout.
5. Retryable transport/provider failures must remain distinct from permanent failures.
6. Authentication/configuration errors are permanent/blocked until configuration changes.
7. Provider outage must not silently fall back to fabricated success/default data.
8. Domain owners decide business fallback behavior; Integrations normalizes provider availability/failure only.
9. Health probes are separate from business operations and must not create real side effects.

## 6. FX rules freeze

1. FX providers return rate observations; they do not directly update product prices.
2. Rate observations must include source/provider identity and observation/fetch time where available.
3. Invalid, non-positive, stale or malformed rates fail closed.
4. Automatic FX fetch does not imply automatic price mutation.
5. Existing preview-before-apply pricing workflow remains mandatory.
6. The affected-product preview must be produced before any FX-driven price apply.
7. Human/admin confirmation remains required for apply unless a later explicitly approved rule changes it.
8. All resulting product monetary values remain integer Toman.

## 7. SMS / Email rules freeze

1. Step 47 reuses `NotificationProviderPort` and `NotificationProviderRegistry` from Notifications.
2. Provider adapters return normalized Notification provider results rather than throwing uncontrolled vendor-specific errors across the module boundary.
3. Existing notification idempotency/delivery retry ownership remains in Notifications.
4. Provider adapter retry must not duplicate notification side effects.
5. Vendor message IDs and safe metadata may be retained; secrets or full credential material may not.

## 8. Shipping rules freeze

1. Fulfillment remains authoritative for shipment lifecycle/status.
2. Shipping adapters provide external capabilities such as quote/create/track/cancel only through explicit owner-facing ports introduced in later substeps.
3. Carrier-specific status values must be normalized before entering Fulfillment.
4. Failed provider calls cannot directly mark shipment success.
5. Provider callbacks/webhooks, if later introduced, require authentication/signature validation and idempotency.

## 9. Auxiliary payment integration rules freeze

1. Payments remains authoritative for intent/payment/refund state.
2. Step 47 does not replace the Payments domain with a vendor SDK abstraction.
3. Provider request/response transport is isolated behind explicit payment-owned or integration-owned adapter ports as designed in later substeps.
4. Ambiguous timeout/network failure cannot be interpreted as payment failure or success without reconciliation/verification.
5. Side-effecting operations require idempotency/provider-reference correlation.
6. Real payment gateway production integration remains governed by the later dedicated roadmap integration phase; Step 47 establishes foundations only.

## 10. Health and observability rules freeze

Canonical normalized health states for later implementation should remain vendor-neutral and fail closed. A2 will define the exact contract.

Health/observability must distinguish at least:
- configured vs unconfigured;
- enabled vs disabled;
- reachable/healthy vs degraded/unavailable;
- last successful probe/use time where safe;
- normalized error category/code;
- no secret payloads.

Health state must never be used as proof that a business transaction succeeded.

## 11. Step-47 execution sequence

- **A1** — Discovery + Integration Ownership / Rules Freeze — COMPLETE
- **A2** — Common Provider Contracts + Failure Model
- **A3** — Integration Configuration + Secrets + RBAC
- **A4** — HTTP Client / Timeout / Retry / Circuit-Breaker Foundation
- **A5** — Provider Health + Observability
- **A6** — FX Provider Port + Rate Fetch
- **A7** — FX Preview-before-Apply Integration
- **A8** — SMS + Email Real Adapter Foundation
- **A9** — Shipping Provider Foundation
- **A10** — Auxiliary Payment Provider Foundation
- **A11** — Security + Failure + Concurrency + E2E Regression
- **A12** — Final Canonical Closure

## 12. A1 acceptance criteria

- Step-47 canonical scope recovered: PASS
- Existing `integrations` module shell identified and retained: PASS
- Notifications provider port/registry reuse identified: PASS
- Payments/Fulfillment/Pricing ownership preserved: PASS
- Configuration ownership considered: PASS
- Secret boundary frozen: PASS
- timeout/retry/fail-closed rules frozen: PASS
- FX preview-before-apply preserved: PASS
- no vendor/provider selected by guess: PASS
- no runtime production code or schema changed in A1: PASS

## 13. Verification note

A1 is a discovery/scope/documentation substep. It intentionally introduces no runtime source, migration or provider implementation. Therefore no new runtime CI result is claimed for A1. Implementation/build/database/security gates become mandatory from A2 onward.

## Next

Proceed to **Step 47 / A2 — Common Provider Contracts + Failure Model**.
