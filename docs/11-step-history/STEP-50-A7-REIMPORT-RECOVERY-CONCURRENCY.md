# Step 50 / A7 — Re-import / Recovery / Concurrency Controls

Status: COMPLETE / FINAL GATE PASS pending final merge/state sync evidence.

## Scope
A7 hardens Excel import orchestration only. Catalog and Pricing remain authoritative for business mutations.

## Implemented
- Forward-only migration `0056_excel_import_recovery.sql`.
- Append-only `excel.import_job_attempts` evidence with bounded attempt numbers (1..3).
- One active processing attempt per import job enforced by a partial unique index.
- Each execution claim receives a unique worker token.
- Completion/failure requires the exact active worker token and processing job state.
- Completed jobs cannot be re-executed.
- Failed jobs require explicit recovery before retry.
- Recovery requires preserved failed-attempt evidence and a bounded normalized operator note.
- Retry is bounded to three total attempts.
- Failed attempt evidence is retained; recovery resets only orchestration job state to pending.
- No direct Catalog/Pricing/Inventory/Payments/Finance mutation path is introduced.

## Files
- `database/migrations/0056_excel_import_recovery.sql`
- `src/modules/excel/infrastructure/import-recovery.repository.ts`
- `src/modules/excel/application/import-recovery.service.ts`
- `src/modules/excel/excel.module.ts`
- `test/excel-recovery-concurrency-a7.spec.ts`

## Verification
Implementation PR: #78
Implementation head: `7da51fe5b9b95eea6463045e2464d5eba41d87b5`
Canonical CI run: `32578116785`
Verify job: `97043356080`

- OpenAPI: PASS — 514 paths / 583 operations / 1146 refs
- Architecture: PASS — 448 files scanned
- Project policy: PASS — `toman-no-wallet-config-boundary`
- TypeScript build: PASS
- A7 dedicated tests: 6/6 PASS
- Runtime tests: 468 PASS / 0 FAIL / 0 skipped / 0 cancelled
- Overall `pnpm verify`: PASS

## Security / concurrency result
- replay of a completed workbook remains fail-closed;
- a processing job cannot be claimed by a second worker;
- stale/wrong worker tokens cannot complete or fail a job;
- failed jobs cannot auto-retry;
- recovery is explicit, evidence-backed and bounded;
- no historical workbook payload is persisted by A7.
