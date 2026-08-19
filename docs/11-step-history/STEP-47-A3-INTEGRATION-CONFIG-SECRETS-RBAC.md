# EQCOFE — Step 47 / A3

## Integration Configuration + Secrets + RBAC

**Status:** IMPLEMENTED / VERIFICATION PENDING

## Scope
A3 introduces provider configuration persistence, secret-reference boundaries and additive RBAC without introducing any real provider credential or vendor.

## Runtime design
- Non-secret provider configuration lives in `integrations.provider_configurations`.
- Secret values do not live in database rows, API payloads or repository files.
- Only an environment-variable reference such as `EQCOFE_FX_MAIN_SECRET` may be persisted.
- `EnvironmentSecretResolver` resolves that reference at runtime and fails closed if missing.
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

## Verification
Dedicated A3 tests cover recursive secret rejection, bounded transport configuration, HTTPS enforcement, missing-secret fail-closed behavior, DB secret-reference-only persistence, additive RBAC and module wiring.

Final status becomes COMPLETE only after canonical CI passes.
