# EQCOFE Step 37 Changelog

- Implemented Cart/Checkout/Order Core and scoped Tax.
- Added customer/guest cart capability flows.
- Added cart version locking and stale-quote rejection.
- Added Shipping Method management.
- Added scoped Tax rule management and precedence.
- Added Inventory reservation plan integration and physical-stock protection reuse.
- Added Checkout/Order immutable snapshots.
- Added customer and guest Order access boundaries.
- Added order lifecycle expiry/cancel inventory release.
- Added Order integration-event contracts.
- Added scheduler expiry orchestration.
- Added database total reconciliation constraints and tax overlap/scope guards.
- Removed obsolete capability-bearing URL routes.
- Hardened Idempotency principal scoping for cart capabilities.
- Reduced Worker/Scheduler module coupling.
