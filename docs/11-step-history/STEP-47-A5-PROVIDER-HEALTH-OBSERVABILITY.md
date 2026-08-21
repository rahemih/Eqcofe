# EQCOFE — Step 47 / A5

## Provider Health + Observability

**Status:** COMPLETE / FINAL GATE PASS

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

## Verification history
The first CI run correctly found an overly strict A4 regression assertion that expected the integration module export list to remain exact. A5 legitimately adds additive exports, so the A4 test was hardened to require the existing `ProviderConfigurationService` and `ProviderHttpClient` exports while permitting future additive exports; runtime A4 behavior was not weakened.

Final Canonical CI run `32468099365`, job `verify` (`96728945724`) passed:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 393 module files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A5 dedicated tests: 6/6 PASS
- full runtime tests: 270 PASS / 0 FAIL / 0 skipped / 0 cancelled
- overall `pnpm verify`: PASS

Therefore:
**STEP 47 / A5 FINAL GATE = PASS**
**A5 = COMPLETE**

## Next approved substep
**Step 47 / A6 — FX Provider Port + Rate Fetch**
