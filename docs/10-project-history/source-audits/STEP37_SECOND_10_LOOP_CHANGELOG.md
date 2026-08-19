# EQCOFE Step 37 — Second Ten-Loop Review Changelog

- Fixed Order aggregate-version sequencing: created=v1, submitted=v2, persisted submitted Order version=2.
- Added `x-cart-token` to API CORS allowed headers.
- Added direct `InventoryModule` import to SchedulerAppModule for valid NestJS DI of InventoryService.
- Aligned `order.created.v1` with canonical `grand_total_toman` event naming.
- Aligned `order.cancelled.v1` schema with runtime `reason_code + note` payload.
- Hardened all four Step-37 Order event schemas with `additionalProperties: false`.
- Restored dedicated `DELETE /cart/{id}/items/{itemId}` and made removal idempotent.
- Updated OpenAPI for the restored Cart DELETE operation.
