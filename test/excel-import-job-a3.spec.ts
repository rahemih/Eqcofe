import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ImportJobService } from '../src/modules/excel/application/import-job.service';
import { ImportJobError } from '../src/modules/excel/domain/import-job';
import { ParsedWorkbook } from '../src/modules/excel/domain/workbook-contract';
import { createWorkbookFingerprint } from '../src/modules/excel/domain/workbook-fingerprint';

const uuid = (n: string) => `${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;
const staffId = uuid('1');

function workbook(value = 'tamper-58', reverseSheets = false): ParsedWorkbook {
  const sheets = [
    { name: 'products', rows: [[value, 'تمپر ۵۸']] },
    { name: 'prices', rows: [['SKU-58', 1_250_000]] },
  ];
  return {
    contractVersion: 'eqcofe-step50-v1',
    fileName: reverseSheets ? 'renamed.xlsx' : 'products.xlsx',
    sheets: reverseSheets ? sheets.reverse() : sheets,
  };
}

function make() {
  const rows = new Map<string, any>();
  const byFingerprint = new Map<string, any>();
  const tx: any = { run: (work: any) => work({}) };
  const repo: any = {
    create: async (_ex: any, input: any) => {
      const key = `${input.contractVersion}:${input.fingerprint}`;
      if (byFingerprint.has(key)) return null;
      const row = {
        id: input.id,
        contract_version: input.contractVersion,
        fingerprint: input.fingerprint,
        status: 'pending',
        requested_by: input.requestedBy,
        created_at: new Date(),
        completed_at: null,
        failure_code: null,
        failure_message: null,
      };
      rows.set(row.id, row);
      byFingerprint.set(key, row);
      return row;
    },
    byFingerprint: async (_ex: any, contractVersion: string, fingerprint: string) =>
      byFingerprint.get(`${contractVersion}:${fingerprint}`) ?? null,
    byId: async (_ex: any, id: string) => rows.get(id) ?? null,
    transition: async (_ex: any, input: any) => {
      const current = rows.get(input.id);
      if (!current || current.status !== input.expectedStatus) return null;
      current.status = input.targetStatus;
      current.completed_at = ['completed', 'failed'].includes(input.targetStatus) ? new Date() : null;
      current.failure_code = input.failureCode;
      current.failure_message = input.failureMessage;
      return current;
    },
  };
  return { service: new ImportJobService(tx, repo), rows };
}

test('Step 50 A3 fingerprint is deterministic for canonical content and ignores filename or sheet order', () => {
  const first = createWorkbookFingerprint(workbook());
  const sameContent = createWorkbookFingerprint(workbook('tamper-58', true));
  const changed = createWorkbookFingerprint(workbook('tamper-51'));
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(first, sameContent);
  assert.notEqual(first, changed);
});

test('Step 50 A3 detects duplicate and concurrent create requests with one canonical job', async () => {
  const { service, rows } = make();
  const [first, second] = await Promise.all([
    service.create({ workbook: workbook(), requestedBy: staffId }),
    service.create({ workbook: workbook(), requestedBy: staffId }),
  ]);
  assert.equal(rows.size, 1);
  assert.equal(first.job.id, second.job.id);
  assert.deepEqual([first.created, second.created].sort(), [false, true]);
  assert.deepEqual([first.replay, second.replay].sort(), [false, true]);
});

test('Step 50 A3 fingerprint ownership conflict fails closed', async () => {
  const { service } = make();
  await service.create({ workbook: workbook(), requestedBy: staffId });
  await assert.rejects(
    () => service.create({ workbook: workbook(), requestedBy: uuid('2') }),
    (error: unknown) => error instanceof ImportJobError && error.code === 'EXCEL_IMPORT_FINGERPRINT_CONFLICT',
  );
});

test('Step 50 A3 lifecycle reaches completed or failed terminal states with validated failure evidence', async () => {
  const completed = make();
  const created = await completed.service.create({ workbook: workbook(), requestedBy: staffId });
  assert.equal((await completed.service.begin(created.job.id)).status, 'processing');
  assert.equal((await completed.service.complete(created.job.id)).status, 'completed');

  const failed = make();
  const failedJob = await failed.service.create({ workbook: workbook('different'), requestedBy: staffId });
  const row = await failed.service.fail(failedJob.job.id, { code: 'EXCEL_PARSE_FAILED', message: 'ساختار workbook معتبر نیست.' });
  assert.equal(row.status, 'failed');
  assert.equal(row.failure_code, 'EXCEL_PARSE_FAILED');
  assert.ok(row.completed_at instanceof Date);
});

test('Step 50 A3 terminal replay cannot restart or rewrite failure evidence', async () => {
  const { service } = make();
  const created = await service.create({ workbook: workbook(), requestedBy: staffId });
  await service.begin(created.job.id);
  await service.complete(created.job.id);
  const replay = await service.create({ workbook: workbook(), requestedBy: staffId });
  assert.equal(replay.replay, true);
  assert.equal(replay.job.status, 'completed');
  await assert.rejects(
    () => service.begin(created.job.id),
    (error: unknown) => error instanceof ImportJobError && error.code === 'EXCEL_IMPORT_REPLAY_BLOCKED',
  );
});

test('Step 50 A3 persistence is forward-only, unique and stores no workbook payload', () => {
  const migration = readFileSync('database/migrations/0055_excel_import_jobs.sql', 'utf8');
  const repository = readFileSync('src/modules/excel/infrastructure/import-job.repository.ts', 'utf8');
  assert.match(migration, /CREATE TABLE excel\.import_jobs/);
  assert.match(migration, /UNIQUE \(contract_version,fingerprint\)/);
  assert.match(migration, /excel_import_jobs_state_shape_check/);
  assert.match(repository, /ON CONFLICT \(contract_version,fingerprint\) DO NOTHING/);
  assert.match(repository, /FOR UPDATE/);
  assert.doesNotMatch(migration, /jsonb|bytea|workbook_payload|file_content/i);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DROP COLUMN/i);
});
