# EQCOFE Step 44 / A7 — Outbound Delivery Engine + Provider Ports + Retry/Backoff/Dead-Letter

Status: COMPLETE / PASS
Date: 2026-08-19
Baseline: Step 44 A6 COMPLETE / Eqcofe-02

## Implemented
- Added vendor-agnostic `NotificationProviderPort` for `sms | email` and an explicit `NotificationProviderRegistry` with no default live provider.
- Missing provider never fabricates success; delivery moves fail-closed to `blocked`.
- Added `NotificationDeliveryService` and `NotificationDeliveryRepository`.
- Worker claim uses `FOR UPDATE ... SKIP LOCKED`, marks selected deliveries `processing` durably, and only then performs provider work.
- External provider `send()` is executed outside the database transaction that claims work and outside finalization transactions.
- Destination is re-resolved from the authoritative recipient port immediately before send; raw customer contact data is not copied into public events.
- Each provider call appends a numbered `delivery_attempts` row; retries reuse the same logical delivery identity.
- Delivered channels are terminal and normal workers do not claim them again.
- Retryable failure moves to `retry_wait` with bounded exponential backoff.
- Maximum attempts and backoff values are read through Central Configuration with safe defaults.
- Exhausted retryable failures move to `dead_lettered`; permanent failures move to `failed`; provider/configuration absence moves to `blocked`.
- Provider exceptions are classified as retryable transport failures rather than being treated as success.
- Delivery outcomes update logical notification state and emit audit + transactional outbox events (`notification.delivery.delivered/failed/dead_lettered.v1`).
- No real SMS/email vendor, credential, SDK, or provider-specific integration was added; provider selection remains Step 47.

## Recovery reconciliation
- A4 source files were recovered byte-for-byte from Library.
- A5/A6 Library had reports/canonical refs but not a complete standalone source snapshot. Their already-approved behavior was reconstructed from canonical reports/invariants and re-verified before A7.
- A new full canonical source artifact through A7 is created in this step so A8 can continue without manual reconstruction.

## Verification
- A7 audit: 26/26 PASS.
- A7 dedicated tests: 4/4 PASS.
- Recovered A5 tests: 6/6 PASS.
- Recovered A6 tests: 5/5 PASS.
- A4 renderer suite: 6/6 PASS.
- Full runtime regression: 110/110 PASS.
- Node 24.18.1 / TypeScript 6.0.3 build: PASS, 0 errors.
- OpenAPI: PASS — 510 paths / 579 operations / 1132 refs.
- Architecture: PASS — 337 files.
- Toman / No-Wallet / configuration-boundary policy: PASS.
- PostgreSQL 18.4 isolated verification: PASS.
- Delivery legally traversed `pending -> processing -> retry_wait -> processing -> dead_lettered`.
- Attempt #1 and #2 were append-only and unique for the same delivery.
- Re-opening a dead-lettered delivery to processing was rejected with `NOTIFICATION_DELIVERY_TERMINAL`.
- Verification branch was deleted; main/default DB unchanged.

## Boundaries preserved
- Provider network calls never occur inside durable enqueue or worker claim/finalization transactions.
- Notifications does not own Customer/Order/Payment/Fulfillment/Inventory/After-Sales business state.
- No secrets are stored in templates, notification payloads, audit or outbox.
- No HTTP controller added before A9.
- No scheduler added before A10.
- Live provider configuration remains Step 47.

## Next
Step 44 / A8 — Domain Event Integrations: Order/Payment/Fulfillment/Inventory/After-Sales and launch-critical events.
