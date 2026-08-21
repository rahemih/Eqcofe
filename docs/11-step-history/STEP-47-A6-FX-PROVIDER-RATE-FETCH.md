# EQCOFE — Step 47 / A6

## FX Provider Port + Rate Fetch

**Status:** IMPLEMENTED / VERIFICATION PENDING

A6 introduces a provider-agnostic FX rate contract and fetch service. It does not select a production vendor and does not mutate product prices.

## Ownership
- Integrations owns FX provider transport, observation validation and immutable fetched-observation history.
- Pricing remains authoritative for currency-rate registration/selection and all product-price mutations.
- A7 will compose fetched observations with Pricing preview-before-apply.

## Runtime rules
- `FxProviderPort` extends the common integration provider contract with `fetchRate`.
- Source currency codes are normalized to three uppercase ISO-like letters.
- Target unit is fixed to `TOMAN`.
- `rateToToman` must be a positive safe integer.
- Observations must have valid timestamps, may not be more than two minutes in the future and must satisfy a bounded freshness window.
- Default freshness is 15 minutes; accepted configured range is 1 minute to 24 hours.
- Fetch calls use common `read` semantics with finite 100–30000 ms timeout.
- Wrong provider kind, missing provider, thrown exception, invalid rate, currency mismatch and stale observation all fail closed.
- Valid observations are appended to `integrations.fx_rate_observations`; UPDATE/DELETE is database-blocked.
- A6 does not call `PricingRepository`, `CurrencyPricingService`, or any price mutation path.
- No real FX vendor, endpoint or secret is introduced in A6.

## Files
- `src/modules/integrations/domain/fx-provider.ts`
- `src/modules/integrations/application/fx-rate.service.ts`
- `src/modules/integrations/infrastructure/fx-rate.repository.ts`
- `database/migrations/0044_integration_fx_rate_observations.sql`
- `src/modules/integrations/integrations.module.ts`
- `test/integrations-step47-a6.spec.ts`

## Existing Pricing composition point
`CurrencyPricingService.refresh()` currently fails closed with `CURRENCY_PROVIDER_NOT_CONFIGURED`. A6 intentionally leaves that method unchanged. A7 will replace that deferred boundary with controlled preview-before-apply composition rather than allowing Integrations to mutate prices directly.

## Verification
A6 becomes COMPLETE only after Canonical CI passes on the exact branch source.

## Next approved substep
**Step 47 / A7 — FX Preview-before-Apply Integration**
