# Step 50 / A6 — Pricing Preview / Apply Boundary

Status: **COMPLETE candidate — exact-head CI required before merge**

## Scope
A6 adds the Pricing-owned preview/apply boundary for the workbook `prices` sheet. Excel remains orchestration-only and does not write Pricing persistence directly.

## Implemented
- `PricingApplyService` parses only `sku` + `price_toman` intent from the sanitized workbook contract.
- SKU identity is resolved through Catalog-owned `PosVariantLookupService`.
- `price_toman` must be a non-negative safe integer Toman value.
- duplicate SKU rows fail closed before mutation.
- `PricingImportApplyService.preview` binds workbook fingerprint, canonical variant ID, current base-price ID/amount, proposed Toman price and profit-guard outcome into a deterministic SHA-256 preview hash.
- Apply requires the exact preview hash.
- Pricing rechecks current base-price identity and amount inside the apply transaction; changed price state fails with `PRICE_CHANGED_SINCE_PREVIEW`.
- price decreases re-run the canonical Profit Guard at apply time.
- Pricing closes the prior base-price interval and appends a new `pricing.base_prices` record using `source_type = excel_import`.
- Pricing preserves canonical Outbox and central Audit evidence, including workbook source fingerprint.
- unchanged proposed prices are no-op mutations.

## Ownership / Security
- Pricing remains authoritative for base-price history and all Toman mutation.
- Catalog remains authoritative for SKU / variant identity.
- Excel has no direct Pricing SQL, Inventory, Payments or Finance mutation authority.
- no new migration, dependency, HTTP/API or RBAC surface is introduced in A6.
- future A8 HTTP apply remains responsible for Staff/RBAC/Step-Up/idempotency exposure.

## Verification
Implementation head before documentation: `9e4bcecf93b0df78b3e4241921e984b3fdb8ca22`

Canonical CI run: `32577388495` — PASS
Job: `verify` (`97041594195`) — PASS

- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 446 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A6 focused tests: **6/6 PASS**
- Runtime tests: **462 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

Initial CI run `32577294596` failed only because the historical A2 regression test encoded the temporary assumption that `ExcelModule` could never import `PricingModule`. The test was narrowed to the durable A2 invariant: parser/template retain no mutation or workbook-execution authority. No test was deleted or disabled.

## Next
After exact-head CI and canonical merge, proceed to **Step 50 / A7 — Re-import / Recovery / Concurrency Controls**.
