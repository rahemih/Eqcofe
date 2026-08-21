# EQCOFE — Step 47 / A5

## Provider Health + Observability

**Status:** IMPLEMENTED / VERIFICATION PENDING

A5 introduces provider-agnostic registration, active health checks and durable operational observations. No real vendor/provider is introduced.

## Runtime design
- `IntegrationProviderRegistry` owns explicitly registered provider ports and rejects duplicate keys.
- `ProviderHealthService` invokes the canonical A2 `health` operation independently from business requests.
- Health timeouts are finite and bounded to 100–30000 ms.
- Unhandled provider exceptions are normalized fail-closed to `unknown` with a safe failure code.
- Every observation is appended to `integrations.provider_health_samples`.
- Health history is immutable; UPDATE/DELETE is database-blocked.
- Current provider state is derived from latest samples, not a mutable status flag.
- Window summaries expose counts by health state and average latency without secret/config payloads.

## Files
- `src/modules/integrations/application/provider-registry.ts`
- `src/modules/integrations/application/provider-health.service.ts`
- `src/modules/integrations/infrastructure/provider-health.repository.ts`
- `src/modules/integrations/integrations.module.ts`
- `database/migrations/0043_integration_provider_health_observability.sql`
- `test/integrations-step47-a5.spec.ts`

## Verification
A5 becomes COMPLETE only after Canonical CI passes on the exact branch source.

## Next approved substep
**Step 47 / A6 — FX Provider Port + Rate Fetch**
