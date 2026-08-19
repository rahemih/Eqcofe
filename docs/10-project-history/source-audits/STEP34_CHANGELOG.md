# STEP 34 CHANGELOG

- Implemented PricingModule with real base-price, rule, bulk-pricing, currency-rate, currency-rule and currency-impact services.
- Added SQL-first migration `0007_pricing_engine.sql` with non-overlapping base-price ranges, explicit pricing scopes, currency rules/rates and bulk preview/apply records.
- All money fields remain integer Toman; no `_irr` or wallet concepts introduced.
- Wired Catalog publication eligibility and product/variant read models to Pricing through `PRICING_PUBLIC_PORT`.
- Product-list pricing is batch-loaded to avoid the N+1 regression.
- Added `PRICING_QUOTE_PORT` for later Cart/Checkout price snapshots.
- Added rule engine semantics for `exclusive`, `stackable`, and `best_only` discounts.
- Quantity-discount rules default to minimum quantity **11** when omitted.
- Added bulk price rounding (`none`, `nearest_1000`, `nearest_10000`, `nearest_100000`).
- Added fail-closed Profit Guard behavior for downward bulk/currency changes and discounts while cost basis is unavailable.
- Added currency anomaly detection against the currently selected rate; >20% deviation is automatically marked suspicious.
- Added currency pricing-rule CRUD lifecycle (create/read/update/activate/deactivate).
- Added Step-Up + Idempotency requirements to high-risk bulk/currency apply operations.
- OpenAPI expanded to 472 paths / 534 operations with no duplicate operationId and no broken refs.
