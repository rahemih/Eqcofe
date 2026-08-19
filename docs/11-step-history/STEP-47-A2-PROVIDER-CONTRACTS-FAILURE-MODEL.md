# EQCOFE — Step 47 / A2

## Common Provider Contracts + Failure Model

**Status:** IMPLEMENTED / VERIFICATION PENDING

## Scope
A2 defines the provider-agnostic language used by later Step-47 adapters. It introduces no vendor, endpoint, credential, FX source, courier, payment gateway or messaging provider.

## Common contracts
The canonical integration boundary now defines:
- provider kinds: `fx`, `sms`, `email`, `shipping`, `payment_aux`;
- operation kinds: `read`, `write`, `health`;
- bounded request context with request ID, timeout and optional idempotency key;
- typed success/failure result contract;
- provider health states: `healthy`, `degraded`, `unavailable`, `unknown`;
- normalized failure kinds and retry disposition.

## Failure model
Normalized failures include timeout, network, rate-limit, authentication, authorization, invalid request, not found, conflict, unavailable, upstream error, invalid response and unknown.

Retry is not inferred from HTTP transport alone. The failure carries a retry disposition (`never`, `safe`, `conditional`) and `mayRetryProviderFailure` additionally blocks write retries unless the caller proves an idempotency key exists.

Unknown failures default to fail-closed and non-retryable. A provider error can never be transformed into a fabricated success by this contract.

## Request safety
`createProviderRequestContext` requires a positive finite timeout of at most 120 seconds. This establishes the A1 rule that no provider call may be unbounded. A4 will own the actual HTTP/timeout/retry executor implementation.

## Ownership boundary
A2 does not replace existing domain ports:
- Step-44 `NotificationProviderPort` remains authoritative for SMS/email delivery semantics;
- Payments remains authoritative for payment lifecycle;
- Fulfillment remains authoritative for shipment lifecycle;
- Pricing remains authoritative for price mutation;
- later adapters may compose these common contracts without moving business ownership into `integrations`.

## Files
- `src/modules/integrations/domain/provider-contracts.ts`
- `src/modules/integrations/domain/provider-failure.ts`
- `src/modules/integrations/domain/provider-request.ts`
- `test/integrations-step47-a2.spec.ts`

## Verification
Eight dedicated A2 tests cover timeout validation, idempotent-write retry policy, auth failures, rate limiting, upstream 5xx, invalid request 4xx, malformed failure metadata and fail-closed unknown failures.

Final status will be changed to COMPLETE only after canonical CI passes.
