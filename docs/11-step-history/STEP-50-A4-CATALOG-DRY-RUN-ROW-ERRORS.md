# Step 50 / A4 — Catalog Dry-Run Validation + Row-Level Error Model

## Status
COMPLETE / FINAL GATE PASS candidate pending exact-head CI and merge.

## Scope
A4 adds read-only Catalog dry-run validation over the sanitized A2 workbook model. It validates `products` and `variants` rows using exported Catalog application boundaries and returns deterministic row-level errors. It does not apply workbook state.

## Implementation
- `CatalogDryRunService` validates required `products` / `variants` sheets and required headers.
- Product rows resolve `product_slug` through `CatalogQueryService`.
- Variant rows resolve SKU through Catalog-owned `PosVariantLookupService` and verify the resolved variant belongs to the workbook product slug.
- Errors retain sheet, 1-based workbook row, code, field and message.
- `prices` is never treated as Catalog authority in A4.
- `ExcelModule` imports `CatalogModule` only to consume exported read/query boundaries.
- A2 parser/template remain free of Catalog mutation and executable-workbook authority.

## Explicitly out of scope
- no Catalog product/variant mutation;
- no Pricing mutation or preview/apply;
- no direct SQL into Catalog;
- no new database migration;
- no HTTP/OpenAPI/RBAC surface;
- no apply/recovery authority.

## Verification
Implementation head after regression correction: `368b549a73c3b84e1b5041cf1b4b7d97190df033`.

Canonical CI run `32575606327`, job `verify` (`97037400585`) — PASS.

- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 442 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A4 focused tests: 6/6 PASS
- Runtime tests: 450 PASS / 0 FAIL / 0 skipped / 0 cancelled
- Overall `pnpm verify`: PASS

The first CI run (`32575520560`) failed only because the historical A2 regression asserted that `ExcelModule` could never import `CatalogModule`. A4 legitimately introduces an exported Catalog read boundary. The assertion was narrowed to the durable invariant: A2 parser/template retain no mutation or workbook execution authority, and Excel still imports no Pricing/Inventory/Payments/Finance or Catalog command services. No test was removed or disabled.

## Next safe action
After exact documentation/current-state head passes Canonical CI and PR #72 is merged, proceed to Step 50 / A5 — Catalog Product / Variant Apply Boundary.
