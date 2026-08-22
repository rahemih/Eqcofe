# Step 50 / A2 — Workbook Contract + Safe Parser / Export Template Foundation

## Status
**COMPLETE / FINAL GATE PASS candidate pending exact documentation-head CI and merge**

## Scope
A2 establishes the first runtime boundary for Excel Product & Pricing Management without adding import-job persistence, business mutation, HTTP/API endpoints, or provider-specific spreadsheet dependencies.

## Implementation
- `src/modules/excel/domain/workbook-contract.ts`
  - versioned `eqcofe-step50-v1` workbook contract;
  - XLSX MIME contract and bounded file/sheet/row/column limits;
  - scalar cell model only;
  - explicit `WorkbookValidationError` codes;
  - versioned export-template model for `products`, `variants`, and `prices`.
- `src/modules/excel/application/safe-workbook-parser.service.ts`
  - validates `.xlsx` name/MIME/size;
  - NFKC-normalizes sheet names and text;
  - rejects duplicate/invalid sheet names;
  - bounds sheet/row/column/cell sizes;
  - rejects macros, external links, formulas, unsupported cell types and unsafe control characters;
  - returns a deterministic sanitized workbook model only.
- `src/modules/excel/application/export-template.service.ts`
  - exposes the canonical Step-50 template metadata;
  - separates Catalog identity/lifecycle columns from Pricing `price_toman` authority;
  - does not apply any business mutation.
- `src/modules/excel/excel.module.ts`
  - exports only parser/template services.
- `src/modules/domain-modules.module.ts`
  - registers `ExcelModule` additively.
- `test/excel-workbook-foundation-a2.spec.ts`
  - focused security/contract tests.

## Security / ownership
- Workbook content remains untrusted input.
- Macro, formula and external-link authority fails closed.
- No code execution/eval/process spawning exists in the parser boundary.
- Excel module imports neither Catalog nor Pricing and cannot mutate them in A2.
- No Inventory, Payments, Orders or Finance authority is introduced.
- `price_toman` appears only as template metadata; Pricing remains authoritative for actual integer-Toman mutation.

## Persistence / API / dependencies
- Database migration: none.
- HTTP/OpenAPI surface: none.
- New npm runtime dependency: none.
- Binary XLSX codec/upload transport remains outside A2; A2 defines the trusted decoded-envelope boundary that later HTTP/import orchestration must feed only after transport-level XLSX inspection.

## Verification evidence
Implementation head: `1e7a23b0b16a954d53a57876bcfb26119221dbbc`

Canonical CI run: `32557880443`  
Job: `verify` (`96994851910`) — **PASS**

- OpenAPI: **PASS** — 514 paths / 583 operations / 1146 refs
- Architecture: **PASS** — 436 files scanned
- Project policy: **PASS** — `toman-no-wallet-config-boundary`
- TypeScript build: **PASS**
- A2 focused tests: **5/5 PASS**
- Runtime tests: **438 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: **PASS**

## Next safe action
After exact documentation/current-state head receives Canonical CI PASS and PR #55 is merged, proceed to **Step 50 / A3 — Import Job Persistence + Fingerprint / Idempotency Foundation**.
