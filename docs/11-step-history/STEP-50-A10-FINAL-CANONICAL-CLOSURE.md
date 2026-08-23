# Step 50 / A10 — Final Canonical Closure

Status: FINAL CLOSURE CANDIDATE — exact-head CI and merge pending.

## Closure audit result

A10 reviewed the complete Step-50 lineage from A1 through A9, the Excel module, migrations, HTTP contract, security boundaries and regression evidence. The audit found one material closure blocker that had to be corrected before Step 50 could be closed:

- A1 required real Excel/XLSX import/export handling with uploaded workbooks treated as untrusted input.
- A2 intentionally defined a sanitized decoded-workbook contract and explicitly deferred binary XLSX transport/package inspection to later orchestration.
- A8/A9 exposed the management API but still accepted client-supplied decoded workbook facts (`sheets`, `hasMacros`, `externalLinks`, `byteLength`). That meant a client could assert security-sensitive workbook metadata instead of the server deriving it from the actual file bytes.

A10 closes that trust gap rather than documenting it away.

## A10 remediation

The Admin Excel boundary now accepts only opaque XLSX file identity plus base64 bytes. `BinaryXlsxCodecService` derives the workbook structure and security facts server-side before the existing `SafeWorkbookParserService` receives the sanitized envelope.

The binary boundary is dependency-free and fail-closed:

- `.xlsx` filename and canonical XLSX MIME are required;
- encoded/binary upload size remains bounded to 10 MiB;
- ZIP entry count is bounded;
- total uncompressed expansion is bounded to 50 MiB;
- ZIP64, encryption and unsupported compression methods are rejected;
- duplicate ZIP entries and path traversal are rejected;
- entry decompression is bounded and CRC32 integrity is verified;
- required OOXML workbook parts must exist;
- VBA projects, ActiveX, embedded executable objects and macro sheets are rejected;
- macro-enabled content types are rejected;
- external-link package parts and external relationships are rejected;
- XML `DOCTYPE` / entity declarations and null bytes are rejected;
- formulas are rejected from the actual worksheet XML;
- worksheet row/column/cell references and supported scalar cell types are bounded and validated;
- workbook sheets/cells are derived from OOXML on the server and cannot be supplied authoritatively by the client.

## Preserved ownership and security boundaries

A10 does not create a new business domain or persistence authority.

- Excel owns workbook/template contracts, import orchestration, fingerprint/idempotency metadata, safe decoding/validation, dry-run/preview orchestration, recovery evidence and management API composition.
- Catalog remains authoritative for Product/Variant/SKU/barcode lifecycle and mutations.
- Pricing remains authoritative for integer-Toman prices, price history and pricing mutation.
- Inventory, Orders, Payments and Finance remain outside Excel authority.
- Catalog/Pricing apply remain bound to exact server-derived preview hashes.
- Existing Staff/RBAC separation remains `excel.view`, `excel.import`, `excel.apply`, `excel.recover`.
- Sensitive apply/recovery mutations retain Step-Up plus idempotency.
- Central Audit continues to store bounded orchestration metadata, never raw workbook/sheet/cell payloads or secrets.
- No spreadsheet/ZIP dependency was added.
- No A10 database migration or permission migration was added.

## Step 50 persistence lineage

The Step-50 database lineage remains exactly the forward-only migrations already introduced before A10:

1. `0055_excel_import_jobs.sql`
2. `0056_excel_import_recovery.sql`
3. `0057_excel_rbac_audit_api.sql`

A10 adds no persistence migration and rewrites no historical migration.

## Verification evidence

Implementation/final-closure PR: `#84`

Green remediation head before this closure-evidence commit:
`c9ebd734ae77468c7db119ce64510508bdd87bbb`

Canonical CI run: `32629646822` — PASS
Verify job: `97170327685` — PASS

Verification result:

- OpenAPI: PASS — 522 paths / 591 operations / 1159 refs
- Architecture: PASS — 451 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A10 focused tests: **8/8 PASS**
- Runtime tests: **494 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- A8 focused regression: **8/8 PASS**
- A9 focused security/regression gate: **10/10 PASS**
- All focused Step-50 suites A2 through A9 remain present and passing.

Two earlier A10 development CI attempts were diagnostic and were corrected before closure:

- `32629413865`: strict TypeScript `noUncheckedIndexedAccess` findings in the new codec; corrected without weakening compiler settings.
- `32629510288`: one corruption test mutated non-payload ZIP metadata and therefore did not trigger the intended integrity failure; the test was corrected to mutate worksheet payload deterministically and assert CRC integrity rejection. Product security behavior was not bypassed.

## Closure decision gate

Step 50 may be declared `CLOSED / FINAL GATE PASS` only after:

1. this closure-evidence head receives Canonical CI PASS;
2. PR #84 is merged to `main`;
3. canonical `CURRENT-STATE.md` and `MASTER-ROADMAP.md` are synchronized in a post-merge state-sync PR;
4. that state-sync head receives Canonical CI PASS and is merged;
5. Linear is synchronized with the final merge and CI evidence.

Until those gates complete, this document remains a closure candidate rather than a claim that Step 50 is already closed.
