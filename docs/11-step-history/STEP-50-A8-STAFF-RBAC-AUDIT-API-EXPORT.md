# Step 50 / A8 — Staff RBAC / Audit / API + Export Operations

Status: COMPLETE / FINAL GATE PASS pending final merge/state-sync evidence.

## Scope
A8 exposes the already-governed Excel A2–A7 orchestration to staff administration without creating a parallel Catalog, Pricing, inventory or payment authority.

## Implemented
- Forward-only migration `0057_excel_rbac_audit_api.sql` with additive permissions:
  - `excel.view` — normal
  - `excel.import` — sensitive
  - `excel.apply` — critical
  - `excel.recover` — critical
- Staff-only `ExcelAdminController` under `/admin/excel`.
- Safe template export contract from the existing A2 `ExportTemplateService`; no invented binary XLSX codec or dependency.
- Dry-run, Catalog preview and Pricing preview are staff/RBAC protected and remain non-mutating.
- Import-job creation is permission-guarded and HTTP-idempotent in addition to A3 fingerprint idempotency.
- Catalog/Pricing apply requires `excel.apply`, Step-Up and idempotency and delegates only to A5/A6 owner boundaries.
- Recovery requires `excel.recover`, Step-Up and idempotency and delegates only to A7 bounded recovery.
- Every HTTP workbook body is passed through the existing fail-closed `SafeWorkbookParserService` before orchestration; missing workbook input now fails with a controlled validation error.
- Central Audit writes only bounded safe metadata (job ID, contract/fingerprint, counts/status/attempt number and bounded recovery reason); raw workbook/sheets are never written to Audit.
- Additive OpenAPI overlay `contracts/http/openapi-step50-a8.yaml` defines 8 strict Admin Excel operations and schemas.
- Canonical OpenAPI validator now assembles sorted `openapi-*.yaml` additive overlays, rejects duplicate paths/components, and validates operation IDs and local refs over the assembled contract.

## API surface
- `GET /admin/excel/exports/template`
- `POST /admin/excel/dry-run`
- `POST /admin/excel/catalog/preview`
- `POST /admin/excel/pricing/preview`
- `POST /admin/excel/imports`
- `POST /admin/excel/catalog/apply`
- `POST /admin/excel/pricing/apply`
- `POST /admin/excel/imports/{id}/recover`

## Security boundary
- No public/customer Excel route exists.
- No endpoint accepts client authority for canonical Product/Variant identity/version, current price, inventory, order, payment or finance state.
- Apply remains preview-hash bound and owner-service controlled.
- Recovery remains bounded to A7 evidence and retry limits.
- No direct Catalog/Pricing SQL exists in the A8 admin service/controller.
- ExcelModule does not import Inventory, Orders, Payments or Finance.

## Verification
Implementation PR: #80
Implementation head before evidence commit: `6bbfba7e7b727827e05d2a691e93ad550eca7926`
Canonical implementation CI run: `32580222781`
Verify job: `97048348609`

- OpenAPI: PASS — 522 paths / 591 operations / 1161 refs; overlay `openapi-step50-a8.yaml` assembled and validated
- Architecture: PASS — 450 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A8 dedicated tests: **8/8 PASS**
- Runtime tests: **476 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

Final exact-head CI, merge commit, canonical main CI and state-sync evidence are recorded after merge.
