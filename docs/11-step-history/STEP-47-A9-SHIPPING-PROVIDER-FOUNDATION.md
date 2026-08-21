# EQCOFE — Step 47 / A9

## Shipping Provider Foundation

**Status:** IMPLEMENTED / VERIFICATION PENDING

A9 preserves Fulfillment ownership of shipment lifecycle while moving provider transport, configuration, secret resolution, timeout/retry/circuit-breaker behavior and webhook cryptographic verification behind Integrations.

## Existing canonical ownership retained
- `ShippingProviderPort` remains in Fulfillment.
- `ShipmentService` remains authoritative for tracking event persistence and shipment state transitions.
- Integrations never writes Fulfillment persistence or shipment state.

## New integration boundary
`ShippingProviderService` in Integrations provides:
- provider-configured tracking refresh through shared `ProviderHttpClient`;
- environment-owned secret resolution through `ProviderConfigurationService`;
- provider response validation and normalized shipping status observations;
- HMAC webhook signature verification with bounded timestamp skew;
- fail-closed handling of invalid/missing configuration and malformed responses.

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

## Verification
A9 becomes COMPLETE only after Canonical CI passes on the exact implementation source.

## Next approved substep
**Step 47 / A10 — Auxiliary Payment Provider Foundation**
