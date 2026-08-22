# EQCOFE Step 49 / A3 — Barcode / SKU Resolution Boundary

**Step:** 49 — Physical Store / POS Backend  
**Substep:** A3 — Barcode / SKU Resolution Boundary  
**Date:** 2026-08-21  
**Status:** COMPLETE / FINAL GATE PASS

## Scope
A3 implements only canonical Catalog-owned SKU/barcode resolution for POS scanner workflows. It does not create a second editable product identity store, pricing authority, inventory authority, payment/finance authority, HTTP API, offline sync or reconciliation workflow.

## Implementation
- `src/modules/catalog/infrastructure/pos-variant-lookup.repository.ts`
  - reads only `catalog.product_variants`;
  - SKU lookup is case-insensitive and bounded to at most two rows for ambiguity detection;
  - barcode lookup is exact and bounded to at most two rows.
- `src/modules/catalog/application/pos-variant-lookup.service.ts`
  - NFKC-normalizes scanner input;
  - rejects control characters and overlong input;
  - validates SKU/barcode syntax;
  - fails closed for missing, ambiguous, inactive or sales-disabled variants;
  - returns only canonical variant/product identity plus SKU/barcode.
- `src/modules/pos/application/pos-scan-resolution.service.ts`
  - delegates resolution to the exported Catalog-owned boundary;
  - contains no SQL and owns no duplicate Catalog state.
- `CatalogModule` exports `PosVariantLookupService`; `PosModule` imports `CatalogModule` and exports `PosScanResolutionService`.

## Existing persistence reused
No new migration is required. Canonical migration `0005_catalog_core.sql` already provides:
- `sku varchar(120) NOT NULL`;
- unique case-insensitive SKU index `uq_catalog_variants_sku_ci`;
- optional `barcode varchar(120)`;
- unique non-null barcode index `uq_catalog_variants_barcode`.

A3 therefore avoids duplicate lookup tables or unnecessary schema changes.

## Security / ownership
- scanner input is untrusted and validated before lookup;
- barcode/SKU are lookup keys only, never authority over product state;
- Catalog remains authoritative for product/variant/SKU/barcode identity;
- inactive or sales-disabled variants fail closed;
- POS receives identity facts only and cannot mutate Catalog through this boundary;
- no Pricing, Inventory, Payments, Finance, Admin, secret or permission authority is introduced.

## Verification evidence
PR: `#46`  
Implementation head: `7c23fee882cfdb4b0c3cd330566d7fceec1fa574`  
Canonical CI run: `32490355870`  
Job: `verify` (`96796278121`) — PASS

`pnpm verify` evidence:
- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs;
- Architecture: PASS — 421 files scanned;
- Project policy: PASS — `toman-no-wallet-config-boundary`;
- TypeScript build: PASS;
- A3 dedicated tests: 5/5 PASS;
- Runtime tests: 381 PASS / 0 FAIL / 0 skipped / 0 cancelled;
- Overall verification: PASS.

The final documentation head must also pass Canonical CI before PR #46 is merged to `main`.

## Next safe action
Proceed to **Step 49 / A4 — Shared Inventory Consumption + Physical/Online Reserve Enforcement** only after exact final-head CI PASS and merge of PR #46.
