# EQCOFE — Step 47 / A3

## Integration Configuration + Secrets + RBAC

**Status:** COMPLETE / FINAL GATE PASS

## Scope
A3 introduces provider configuration persistence, secret-reference boundaries and additive RBAC without introducing any real provider credential or vendor.

## Runtime design
- Non-secret provider configuration lives in `integrations.provider_configurations`.
- Secret values do not live in database rows, API payloads or repository files.
- Only an environment-variable reference such as `EQCOFE_FX_MAIN_SECRET` may be persisted.
- `EnvironmentSecretResolver` resolves that reference through Nest `ConfigService`, preserving the platform config boundary, and fails closed if missing.
- Provider configuration validates key, kind, bounded timeout/retry, HTTPS endpoint and recursively rejects sensitive configuration keys.
- Database trigger independently rejects secret-like keys inside the JSON configuration object.

## RBAC
Migration `0042_integration_configuration_rbac.sql` adds, idempotently:
- `integrations.view` — normal;
- `integrations.manage` — high;
- `integrations.secret_ref.manage` — critical.

The critical permission changes only a secret reference name; it never grants read access to the underlying secret value.

## Files
- `src/modules/integrations/domain/provider-configuration.ts`
- `src/modules/integrations/application/provider-configuration.service.ts`
- `src/modules/integrations/infrastructure/provider-configuration.repository.ts`
- `src/modules/integrations/infrastructure/environment-secret.resolver.ts`
- `src/modules/integrations/integrations.module.ts`
- `database/migrations/0042_integration_configuration_rbac.sql`
- `test/integrations-step47-a3.spec.ts`

## Verification history
The first CI run correctly rejected direct `process.env` access outside the platform config boundary. A3 was fixed to resolve environment-owned secrets through Nest `ConfigService`.

A later CI run then caught a TypeScript contract mismatch (`ProviderKind` vs canonical `IntegrationProviderKind`); the implementation was corrected without weakening any gate.

Final Canonical CI run `32312649706`, job `verify` (`96258605260`) passed:
- frozen-lockfile install: PASS
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 388 module files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A3 dedicated tests: 6/6 PASS
- full runtime tests: 258 PASS / 0 FAIL / 0 skipped / 0 cancelled
- overall `pnpm verify`: PASS

Therefore:
**STEP 47 / A3 FINAL GATE = PASS**
**A3 = COMPLETE**

## Next approved substep
**Step 47 / A4 — HTTP Client / Timeout / Retry / Circuit-Breaker Foundation**
