# STEP 35 — Inventory Engine Changelog

- Added warehouse management and physical-store protection percentage.
- Added stock balances with on-hand/reserved/allocated/damaged/quarantine invariants.
- Added online-sellable calculation derived from warehouse protection rules.
- Added reservation lifecycle including payment-pending, late-payment review, converted commitments, expiry scheduling and commitment release.
- Added allocation lifecycle tied to order items and optional source reservations.
- Added allocation release semantics that restore converted reservation commitment for re-planning.
- Added append-only inventory movements.
- Added FIFO cost layers in Toman and cost-layer consumptions for COGS lineage.
- Added cost buckets: sellable, quarantine, damaged; condition changes preserve cost lineage.
- Added inter-warehouse transfer flow with FIFO source consumption and destination cost-layer reconstruction.
- Added damaged disposal and quarantine release semantics.
- Connected Pricing Profit Guard to InventoryCostBasisService; removed deferred cost-basis wiring.
- Added Inventory public ports for availability and reservations.
- Added scheduler-driven reservation expiry using application commands rather than direct SQL.
- Added 15 inventory event JSON Schemas.
- Expanded OpenAPI inventory contract and permissions.
