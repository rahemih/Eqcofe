# EQCOFE — Step 47 / A7

## FX Preview-before-Apply Integration

**Status:** IMPLEMENTED / VERIFICATION PENDING

A7 composes the A6 FX observation service with the existing Pricing currency workflow while preserving Pricing ownership and mandatory preview-before-apply.

## Flow
1. Admin calls the existing `POST /admin/pricing/currency-rates/refresh` route with a configured `provider_key` and scope.
2. Pricing delegates external observation retrieval to `FxRateService`.
3. Invalid, stale, mismatched or failed provider observations fail closed before Pricing registration.
4. Valid observations are registered in the existing Pricing currency-rate model.
5. Rates marked suspicious by existing deviation rules are retained for review but cannot create an impact preview.
6. Validated rates are passed to the existing `CurrencyImpactService.preview` path, including currency rules, Toman rounding and ProfitGuard evaluation.
7. The response returns the observation, Pricing currency rate and `preview_id`, with `apply_required=true`.
8. No price mutation occurs during refresh/preview.
9. Price mutation remains exclusively in `POST /admin/pricing/currency/apply`, which continues to require Step-Up and idempotency and consumes a valid non-expired `preview_id`.

## Ownership / boundaries
- Integrations owns provider transport and FX observation validity.
- Pricing owns rate registration, deviation classification, currency rules, ProfitGuard, previews and price mutation.
- Pricing depends on exported `FxRateService`; Integrations does not import Pricing, avoiding a circular domain dependency.
- The orchestrator contains no raw HTTP client, vendor URL or secret logic.
- No new vendor/provider is selected in A7.

## Files
- `src/modules/pricing/application/fx-currency-preview.service.ts`
- `src/modules/pricing/presentation/pricing.controller.ts`
- `src/modules/pricing/pricing.module.ts`
- `test/integrations-step47-a7.spec.ts`

## Safety invariants
- Provider failures never fabricate a rate.
- Suspicious rates cannot proceed to pricing preview automatically.
- Refresh never calls price apply.
- Existing ProfitGuard remains part of the preview computation.
- Existing preview expiry and expected affected-count checks remain authoritative at apply time.
- Apply remains Step-Up + idempotency protected.
- Financial values remain integer Toman.

## Verification
A7 becomes COMPLETE only after Canonical CI passes on the exact branch source.

## Next approved substep
**Step 47 / A8 — SMS + Email Real Adapter Foundation**
