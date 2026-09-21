# Step 60-B — Backend/OpenAPI Listing Contract Readiness

## Status at branch creation

- Canonical base: `4a9b1e921561eb09b22a44acf2aff05147144b15`
- Step 60-A: `CANONICAL_COMPLETE`
- A10: `CANONICAL_COMPLETE`
- Final Agent Layer: `CANONICAL_COMPLETE`
- Open PRs before write: `0`
- Active relevant Locks: `0`
- Competing writer on `docs/14-multi-agent/generated/TASK-CATALOG.md`: `NONE`
- Risk: `MEDIUM`
- Human Gate: `NOT_REQUIRED`

## Problem confirmed by live canonical audit

Stage 60-A recorded that Search/Category discovery endpoints existed but successful response bodies were untyped. The Stage 60-B read-only audit additionally proved contract drift:

- `GET /products` advertised `min_price`, `max_price`, `available` and `sort`, while the backend only consumed `category`, `brand`, `cursor` and `limit`.
- `GET /search` implemented `q`, `cursor` and `limit`, but OpenAPI only described `q` and had no successful response schema.
- `GET /search/suggestions` implemented query/limit behavior but had no typed request/response contract.
- Category products and category filters were implemented but their successful response bodies were untyped.
- Public ProductCard `availability.in_stock` was hard-coded to `false` despite the canonical Inventory public availability port being available.
- Product prices can legitimately be unavailable; the public card contract therefore needs an explicit nullable price instead of a false non-null guarantee.

## Canonical decisions

1. Stage 60-B makes the contract truthful for capabilities that already exist.
2. Advanced selectable sorting and price/availability filtering are **not** faked in this Stage; they remain Stage 60-F implementation scope.
3. Public listing default order remains backend-owned `newest`; Search remains backend-owned relevance order.
4. Cursor pagination remains authoritative for public product/search listing.
5. Search accepts `q + cursor + limit`.
6. Category products accept path `slug` plus `cursor + limit + brand`.
7. Search suggestions accept optional `q` and bounded `limit`.
8. ProductCard reuses canonical `BrandRef`, `CategoryRef`, `MediaRef`, `PriceView` and `AvailabilityView`.
9. ProductCard price is a required key whose value may be `null` when no sellable authoritative price exists.
10. `in_stock` is derived from the canonical `INVENTORY_AVAILABILITY_PORT`; Catalog does not import an Inventory repository.
11. Category filter responses normalize missing SQL aggregate values to an empty array.
12. Any undeclared query key on the public listing/search boundaries fails closed instead of being silently ignored.
13. Generated OpenAPI parity is tested by regenerating to a temporary file with `openapi-typescript` and requiring byte-for-byte equality.

## Stage boundary

This Stage does **not** implement:
- Search/Category UI;
- URL-state UI;
- selectable sort controls;
- min/max price filtering;
- availability filtering;
- attribute-value product filtering;
- migrations;
- pricing-rule changes;
- Inventory module mutation;
- Step 61+ behavior.

Those remain in later Step 60 stages as frozen by 60-A.

## Definition of Done

- source OpenAPI and generated types are synchronized;
- Search/Category/Filters/Suggestions success bodies are typed;
- false listing parameters are removed from the public contract;
- unsupported public query keys fail closed;
- Inventory authority drives ProductCard stock truth;
- category filter values are normalized;
- generated-contract parity test passes;
- all relevant tests and root `pnpm verify` pass;
- exact changed paths match the Task Contract;
- MEDIUM deterministic Review + Verification pass;
- exact-artifact Lock is ACTIVE before protected transport;
- protected Merge Policy merge passes;
- exact-SHA postmerge `pnpm verify` and Phase A pass;
- Lock is terminally `RELEASED`;
- only then may 60-C start.

## Deterministic design-source synchronization

The first exact-head Canonical CI correctly failed closed in `design:validate` because Step56-A retains SHA256 evidence for recovered sources. The two intentionally changed recovered sources were:

- `contracts/http/openapi.yaml` → `980b91e0880c6a47a723d0c1ada2a6a136b9b485393849d908425b91b6b72b2c`
- `src/modules/catalog/catalog.module.ts` → `dd7feb86db43784a22677118132157dcd3e5303430c7278a9e1fb75dbbe93d89`

The canonical Step56-A contract was minimally refreshed for only those two source hashes. Its deterministic manifest `sourceSha256` was then synchronized to `9e79729fd06bbd5a3086992fb4f3077775deffb2153addecafdf698ec9502481`. No historical baseline snapshot, screen inventory, design scope, operation ownership, permissions, source gaps or wireframe semantics were rewritten.
