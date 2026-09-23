# Step 60-F — Filters, Sorting & Cursor Pagination

## Status
- Canonical base: `70c7695e670239463ce0101a641523623eed8fdd`
- Step 60-A..E: `CANONICAL_COMPLETE`
- Stage 60-F: `IN_PROGRESS`
- Task: `EQCOFE-STEP60-F-FILTER-SORT-PAGE-001`
- Linear: `HOS-16`

## Fresh Live Guard
- main = `70c7695e670239463ce0101a641523623eed8fdd`
- open PRs = `0`
- competing Step-60 writer = `NONE`
- Step 60-E Lock = `RELEASED`
- Step 60-F branch before registration = `ABSENT`

## Canonical UX contract
SF-B-05 freezes the primary filter order as: selection summary → sort → availability → brand → Toman price range → apply/clear. Filtered state keeps selections visible/removable. Responsive drawer/aside hardening is completed in 60-G, but Stage F must preserve semantic/focus order and 44×44 targets.

## Backend authority
Stage F does not mutate Pricing or Inventory modules. Effective product prices come only from `PricingPublicPort.getProductPrices`; online stock truth comes only from `InventoryAvailabilityPort.getOnlineSellableQuantities`. Catalog supplies public candidates and category attribute assignments. Advanced filter evaluation is bounded and fail-closed.

## Sort semantics
- Search default: `relevance`.
- Category/general listing default: `newest`.
- Selectable canonical sorts: `newest`, `price_asc`, `price_desc`; Search additionally accepts `relevance`.
- Price-null products remain valid for non-price filtering but sort after priced products; any explicit price range excludes null-price products.

## Query dimensions
- shared: `cursor`, `limit`, `brand`, `min_price`, `max_price`, `available`, `sort`.
- Search additionally owns `q`.
- Category additionally accepts repeated `attribute_value` UUID selections only if present in authoritative category filter metadata.
- changing any result-set dimension resets cursor.
- query normalization/serialization is deterministic.

## Safety bound
The advanced evaluator has a finite candidate ceiling. Exceeding it returns a validation/domain failure rather than partial filtered/sorted results. This preserves correctness while avoiding unbounded Pricing/Inventory batch work.

## Boundary
60-F does not perform final metadata/SEO, full responsive/axe/reflow hardening (60-G), full acceptance/prototype (60-H), or Roadmap/Current-State closure (60-I).

```text
STEP_60_A_TO_E = CANONICAL_COMPLETE
STEP_60_F = IN_PROGRESS
STEP_60_G = BLOCKED_UNTIL_60_F_CANONICAL_COMPLETE
STEP_60_H_TO_I = NOT_STARTED
```
