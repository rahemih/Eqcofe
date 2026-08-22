# Step 50 / A9 — Security / E2E / Regression Gate

Status: COMPLETE / FINAL GATE PASS.

## Scope
A9 is a gate-only substep. It adds no business feature, persistence authority, migration, dependency, or HTTP surface. It verifies that the complete Step-50 A2–A8 implementation preserves the frozen ownership, security, concurrency, idempotency, audit and contract boundaries before final closure.

## Verified invariants
- All Excel management HTTP routes remain `StaffOnly` and explicitly permission-separated through `excel.view`, `excel.import`, `excel.apply`, and `excel.recover`.
- Catalog/Pricing apply and import recovery require both Step-Up and canonical HTTP idempotency; import creation is idempotent as well.
- Every workbook remains untrusted and passes through `SafeWorkbookParserService`; macros, external links, formulas, invalid file bounds and unsupported cell types fail closed.
- Catalog and Pricing apply remain bound to exact server-derived preview hashes and delegate to the owning Catalog/Pricing boundaries; Excel does not write their tables directly.
- Recovery remains explicit, bounded and concurrency-controlled through A7 attempt/worker-token evidence.
- Central Audit uses bounded metadata and never stores raw workbook/sheet/cell payload or secrets.
- The A8 OpenAPI contract agrees with runtime permission, Step-Up and idempotency controls.
- Excel migration lineage remains forward-only and additive: `0055_excel_import_jobs.sql`, `0056_excel_import_recovery.sql`, `0057_excel_rbac_audit_api.sql`.
- Every Step-50 focused regression suite from A2 through A8 remains present.
- `ExcelModule` gains no Inventory, Orders, Payments or Finance authority.
- A9 introduces no migration or persistence authority of its own.

## Verification
Implementation PR: `#82` — MERGED
Initial/focused gate head: `2d46def081cfdf795372a555eefe3d77fcbf4112`
Final PR head: `7f88eea3587e960b0632fc65425ebbfc742a56c1`
Merge commit: `d67a70ffd0fc54a8fe908a4a7e608cc06b49e1ad`
Canonical focused CI run: `32584563409` — PASS
Focused verify job: `97058886399` — PASS
Final exact-head CI run: `32584676256` — PASS
Final exact-head verify job: `97059158988` — PASS

- OpenAPI: PASS — 522 paths / 591 operations / 1161 refs
- Architecture: PASS — 450 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A9 dedicated tests: **10/10 PASS**
- Runtime tests: **486 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: PASS

The documentation-only final state-sync records canonical `main` status and advances Step 50 to A10.
