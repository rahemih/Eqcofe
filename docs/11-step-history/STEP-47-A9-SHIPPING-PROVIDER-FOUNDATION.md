# EQCOFE — Step 47 / A9

## Shipping Provider Foundation

**Status:** COMPLETE / FINAL GATE PASS

A9 preserves Fulfillment ownership of shipment lifecycle while moving provider transport, configuration, secret resolution, timeout/retry/circuit-breaker behavior and webhook cryptographic verification behind Integrations.

## Existing canonical ownership retained
- `ShippingProviderPort` remains in Fulfillment.
- `ShipmentService` remains authoritative for tracking event persistence and shipment state transitions.
- Integrations never writes Fulfillment persistence or shipment state.

## New integration boundary
`ShippingProviderService` in Integrations provides provider-configured tracking refresh through the shared `ProviderHttpClient`, environment-owned secret resolution through `ProviderConfigurationService`, provider response validation/normalization and fail-closed HMAC webhook verification with bounded timestamp skew.

`IntegrationShippingProviderAdapterFactory` bridges the existing Fulfillment port to the Integrations service. The Fulfillment registry no longer reads provider transport/secrets directly.

## Compatibility hardening
The historical `ConfiguredShippingProvider` remains as a compatibility adapter but no longer performs direct fetch calls or reads API/webhook secret values. Runtime wiring uses the new adapter factory.

## Safety invariants
- no shipping vendor is hard-coded;
- provider kind must be `shipping`;
- production URL policy and resilience are inherited from the shared Provider HTTP client;
- tracking refresh is a read operation with finite timeout and bounded retries;
- webhook raw body and valid HMAC/timestamp are mandatory;
- Integrations returns observations only; Fulfillment decides/persists shipment transitions.

## Verification evidence
Canonical CI run `32473449568`, job `verify` (`96744859189`) passed on A9 source commit `edfd5c203b83d941201e859bddd95e321d649649`:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- architecture: PASS — 400 files scanned
- project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A9 dedicated tests: **8/8 PASS**
- runtime tests: **300 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- overall `pnpm verify`: PASS

## Next approved substep
**Step 47 / A10 — Auxiliary Payment Provider Foundation**
