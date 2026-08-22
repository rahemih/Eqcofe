# Step 50 / A5 — Catalog Product / Variant Apply Boundary

## Status
COMPLETE candidate — implementation verified on PR head; final closure requires exact-head CI and merge.

## Scope
A5 adds the Catalog mutation boundary for the validated Step-50 workbook without giving Excel direct ownership of Catalog persistence.

## Implementation
- `CatalogApplyService` derives a server-side preview only after A4 dry-run succeeds.
- Preview binds the workbook fingerprint to canonical Product and Variant IDs plus optimistic versions.
- Preview hash changes when canonical versions or workbook content changes.
- Apply requires the exact preview hash and fails closed with `EXCEL_PREVIEW_STALE` when stale or mismatched.
- `CatalogImportApplyService` lives in Catalog and owns all actual Product/Variant mutation.
- Catalog apply executes product and variant changes inside one Catalog transaction.
- Product changes support `name_fa` and valid Catalog lifecycle status requests (`draft`, `published`, `archived`) through aggregate lifecycle rules.
- Variant changes support `barcode` through the existing Variant aggregate.
- Every changed aggregate preserves optimistic version checks, Outbox and central Audit behavior.
- Publishing still enforces Catalog's existing active-variant and sellable-price rules; Excel never mutates Pricing.
- No direct Catalog SQL exists in Excel.

## Security / ownership
- Catalog remains authoritative for Product/Variant/SKU/barcode identity and lifecycle.
- Pricing remains authoritative for prices and pricing mutation.
- No Inventory, Payments, Orders or Finance authority is introduced.
- No new migration, dependency, HTTP endpoint, RBAC key or recovery path is introduced in A5.
- A stale preview cannot be applied after canonical Product/Variant versions change.
- Multi-row Catalog apply is transactional to avoid partial Catalog mutations.

## Verification
Implementation PR: #74
Implementation head: `07695e1adf994a5a5bc9ba45f31e678da89e89f5`
Canonical CI run: `32576419753` — PASS
Verify job: `97039325191` — PASS

- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 444 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A5 focused tests: 6/6 PASS
- Runtime tests: 456 PASS / 0 FAIL / 0 skipped / 0 cancelled
- Overall `pnpm verify`: PASS

## Next
After exact-head CI and merge, Step 50 / A6 — Pricing Preview / Apply Boundary.
