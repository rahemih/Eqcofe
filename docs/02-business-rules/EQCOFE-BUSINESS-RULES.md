# EQCOFE Canonical Business Rules

Statuses in this document distinguish verified/current rules from historical/superseded material. Implementation evidence should be checked in source/tests for enforcement details.

## Money and finance
1. Base storage/calculation/display unit for project financial logic: **Toman**.
2. Wallet is **REMOVED / PROHIBITED**.
3. Profit accounting uses actual costs/COGS/expenses before distribution; profit split can have global rules and scoped overrides.
4. Monetary changes require preview/validation where applicable and audited/admin-safe mutation patterns.

## Catalog
1. Products support independent variants such as size/color/model/SKU.
2. Product comparison is limited to at most four products and should remain category-compatible.
3. Out-of-stock products are not blindly deleted; archive/reactivation semantics preserve history.
4. Product rich media may include multiple images, short video and 3D/360 assets.

## Inventory
1. Physical and online sales share controlled inventory rules rather than independent uncoordinated stock.
2. Default physical-store reserve is **20%** (centrally configurable as of Step 43).
3. Default low-stock threshold is **10** (central configuration).
4. Out-of-stock archive threshold is **30 days** (central configuration).
5. Product variants have independent stock.
6. Inventory operations preserve FIFO/cost lineage and concurrency protections implemented in the Inventory domain.

## Pricing and wholesale
1. `customer_type`: `retail | wholesale`.
2. A customer may not self-declare wholesale status; only an approved wholesale application promotes authoritative type.
3. Wholesale lifecycle: `submitted -> under_review -> approved/rejected`; approve/reject decisions are terminal/immutable.
4. One active wholesale application per customer.
5. Quantity-discount default threshold is **11 units**; configuration owns the current operational threshold.
6. Bulk/category/brand/FX-linked price changes require preview/control before apply.
7. Automatic exchange-rate source is configurable; affected products are previewed before price application.

## Customer
1. Exactly one authoritative customer profile per authenticated account where applicable.
2. Address ownership is customer-scoped and historical orders keep their own snapshots.
3. At most one default address per customer.
4. Wishlist is a unique `(customer_id, product_id)` set and does not copy catalog price/stock/title.
5. Orders/Returns/Warranty remain owned by their own domains; Customer receives read models/ports only.

## Orders / payments / after-sales
1. Payment and refund handling is idempotent, auditable and fail-closed when a live provider is unavailable.
2. External provider calls must not occur in the transaction that creates durable core business state.
3. Returns, warranty, replacement/refund/restock resolution preserve immutable/auditable history.
4. Terminal business decisions cannot be silently overwritten.

## Notifications
1. Channels: `sms | email | in_app`.
2. Notification enqueue and per-channel delivery are idempotent and DB-protected.
3. Recipient contact is resolved authoritatively server-side; spoofing another recipient is prohibited.
4. Missing/disabled provider never fabricates success.
5. In-app can operate independently of external channel availability.
6. Template versions are immutable once used; changes create a new version.
7. `delivered` is terminal; dead-letter manual retry requires RBAC + Step-Up + Idempotency and an explicit DB guard.
8. Live SMS/email provider selection/credentials remain Step 47.

## Store configuration
Canonical seeded operational defaults include:
- cart TTL 168 hours
- checkout TTL 15 minutes
- reservation TTL 15 minutes
- order pending TTL 30 minutes
- guest order access 7 days
- physical store reserve 20%
- low stock threshold 10
- out-of-stock archive 30 days
- wholesale quantity discount min qty 11
- global sales enabled true

## Removed / superseded product decisions
- WordPress storefront architecture: **SUPERSEDED** by custom coded/headless architecture.
- Wallet: **REMOVED**.
- Old historical assumptions that conflict with later verified Steps are preserved only in `SUPERSEDED-DECISIONS.md`.
