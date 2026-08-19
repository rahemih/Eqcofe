# Steps 29–35 Review Changelog

- Fixed late-payment reservation re-acquisition after expiry.
- Prevented double-release semantics through per-item released quantity tracking.
- Removed Pricing/Inventory reverse type dependency; introduced Inventory-owned public cost-basis port and Pricing adapter.
- Made Profit Guard cost basis conservative for mixed FIFO layers.
- Fixed quantity-discount default threshold at 11.
- Added price-rule scope conflict validation.
- Added stale-preview protection to Bulk Pricing Apply.
- Hardened idempotency replay status, principal scope and unknown-outcome behavior.
- Removed unsafe automatic retry classification for arbitrary post-handler failures.
- Enforced warehouse RBAC scopes on Inventory reads and writes.
- Added explicit Inventory input validation and duplicate-item checks.
- Corrected inventory movement semantics for quarantine/damaged bucket moves.
- Added permanent Inventory domain tests.
- Removed stale `.tmp` repository file.
- Added no-`any` Domain architecture guard.
- Introduced MediaStoragePort and configured adapter; removed insecure media signing fallbacks.
- Required media upload base URL/signing secret in production.
- Changed physical-store stock protection default from 0% to 20%.
