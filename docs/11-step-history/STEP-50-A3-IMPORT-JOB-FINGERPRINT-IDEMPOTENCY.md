# Step 50 / A3 — Import Job Persistence + Fingerprint / Idempotency Foundation

## Status
**COMPLETE / FINAL GATE PASS candidate pending exact documentation-head CI and merge**

## Scope
A3 adds only the import-job identity, lifecycle and content-idempotency persistence boundary. It does not validate Catalog rows, mutate Catalog/Pricing, expose HTTP endpoints, persist workbook binaries, or apply imported business state.

## Implementation
- `src/modules/excel/domain/workbook-fingerprint.ts`
  - computes a deterministic SHA-256 fingerprint from the sanitized A2 `ParsedWorkbook` model;
  - includes the workbook contract version and canonical sheet/row/cell content;
  - ignores filename and sheet order so presentation-only changes cannot bypass idempotency;
  - persists neither the raw upload nor decoded workbook payload.
- `src/modules/excel/domain/import-job.ts`
  - defines `pending`, `processing`, `completed`, and `failed` states;
  - permits only pending → processing/failed and processing → completed/failed;
  - keeps completed/failed terminal and rejects replay or conflicting failure evidence.
- `database/migrations/0055_excel_import_jobs.sql`
  - creates the forward-only `excel.import_jobs` persistence boundary;
  - enforces `UNIQUE (contract_version,fingerprint)` at the database layer;
  - enforces terminal timestamp/failure-evidence state shape;
  - references the requesting IAM account and stores metadata only.
- `src/modules/excel/infrastructure/import-job.repository.ts`
  - uses `ON CONFLICT DO NOTHING` plus locked reads for concurrent duplicate creation;
  - performs compare-and-transition updates from the expected status only.
- `src/modules/excel/application/import-job.service.ts`
  - creates or safely replays the canonical job;
  - fails closed when identical content belongs to another requester;
  - provides idempotent begin/complete/fail lifecycle operations;
  - never reopens a terminal job.
- `src/modules/excel/excel.module.ts`
  - registers the repository internally and exports only `ImportJobService`.
- `test/excel-import-job-a3.spec.ts`
  - covers deterministic fingerprinting, duplicate/concurrent creation, ownership conflict, lifecycle failure and terminal replay safety.

## Regression-gate correction
The Step-49 A10 regression test previously treated every future `0055_*` migration as forbidden. Its scope was corrected without deleting or disabling the gate: it still proves A10 added no Step-49/POS security-concurrency persistence, while no longer blocking valid forward-only migrations in later steps.

## Security / ownership
- Fingerprints are SHA-256 hashes of the already sanitized A2 model, not client-supplied authority.
- Database uniqueness is the concurrency authority; application pre-checks are not trusted.
- Different requesters cannot adopt or inspect a prior import through fingerprint replay.
- No Catalog, Pricing, Inventory, Payments, Orders or Finance module/repository is imported.
- No workbook binary, raw payload, secret, production data or business mutation is persisted.

## Persistence / API / dependencies
- New migration: `0055_excel_import_jobs.sql` — forward-only.
- HTTP/OpenAPI surface: none.
- New npm dependency: none.
- Dry-run row validation remains A4.

## Verification evidence
Implementation head: `cacd969d12d106e17fae4fa106c411904350458c`

Canonical CI run: `32573137560`

Job: `verify` (`97031479566`) — **PASS**

- OpenAPI: **PASS** — 514 paths / 583 operations / 1146 refs
- Architecture: **PASS** — 440 files scanned
- Project policy: **PASS** — `toman-no-wallet-config-boundary`
- TypeScript build: **PASS**
- A3 focused tests: **6/6 PASS**
- Runtime tests: **444 PASS / 0 FAIL / 0 skipped / 0 cancelled**
- Overall `pnpm verify`: **PASS**

## Next safe action
After exact documentation-head Canonical CI passes and PR #70 is merged, synchronize the canonical current-state documents and proceed to **Step 50 / A4 — Catalog Dry-Run Validation + Row-Level Error Model**.
