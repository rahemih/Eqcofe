import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ImportRecoveryService } from '../src/modules/excel/application/import-recovery.service';
import { ImportJobError } from '../src/modules/excel/domain/import-job';

const uuid = (n: string) => `${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;
const jobId = uuid('1');

function make(initialStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'pending') {
  const job: any = { id: jobId, status: initialStatus, completed_at: initialStatus === 'failed' || initialStatus === 'completed' ? new Date() : null, failure_code: initialStatus === 'failed' ? 'EXCEL_APPLY_FAILED' : null, failure_message: initialStatus === 'failed' ? 'apply failed' : null };
  const attempts: any[] = [];
  const tx: any = { run: (work: any) => work({}) };
  const jobs: any = {
    transition: async (_ex: any, input: any) => {
      if (job.status !== input.expectedStatus) return null;
      job.status = input.targetStatus;
      job.failure_code = input.failureCode;
      job.failure_message = input.failureMessage;
      job.completed_at = input.targetStatus === 'completed' || input.targetStatus === 'failed' ? new Date() : null;
      return job;
    },
  };
  const recovery: any = {
    lockJob: async () => job,
    activeAttempt: async () => attempts.find((x) => x.status === 'processing') ?? null,
    latestAttempt: async () => [...attempts].sort((a, b) => b.attempt_no - a.attempt_no)[0] ?? null,
    insertAttempt: async (_ex: any, input: any) => {
      const row = { id: input.id, job_id: input.jobId, attempt_no: input.attemptNo, worker_token: input.workerToken, status: 'processing', started_at: new Date(), ended_at: null, failure_code: null, failure_message: null, recovery_note: null };
      attempts.push(row);
      return row;
    },
    finishAttempt: async (_ex: any, input: any) => {
      const row = attempts.find((x) => x.job_id === input.jobId && x.worker_token === input.workerToken && x.status === 'processing');
      if (!row) return null;
      row.status = input.status;
      row.ended_at = new Date();
      row.failure_code = input.failureCode;
      row.failure_message = input.failureMessage;
      return row;
    },
    recordRecovery: async (_ex: any, input: any) => {
      const row = attempts.find((x) => x.job_id === input.jobId && x.attempt_no === input.attemptNo && x.status === 'failed' && !x.recovery_note);
      if (!row) return null;
      row.recovery_note = input.note;
      return row;
    },
    resetFailedJob: async () => {
      if (job.status !== 'failed') return null;
      job.status = 'pending';
      job.completed_at = null;
      job.failure_code = null;
      job.failure_message = null;
      return job;
    },
  };
  return { service: new ImportRecoveryService(tx, jobs, recovery), job, attempts };
}

test('Step 50 A7 claim serializes execution and issues a worker token', async () => {
  const { service, job, attempts } = make();
  const claim = await service.claim(jobId);
  assert.equal(claim.attemptNo, 1);
  assert.match(claim.workerToken, /^[0-9a-f-]{36}$/);
  assert.equal(job.status, 'processing');
  assert.equal(attempts.length, 1);
  await assert.rejects(() => service.claim(jobId), (error: any) => error instanceof ImportJobError && error.code === 'EXCEL_IMPORT_ALREADY_PROCESSING');
});

test('Step 50 A7 terminal transition requires the exact active worker token', async () => {
  const { service, job } = make();
  const claim = await service.claim(jobId);
  await assert.rejects(() => service.complete(jobId, uuid('2')), (error: any) => error?.code === 'EXCEL_IMPORT_WORKER_TOKEN_CONFLICT');
  assert.equal(job.status, 'processing');
  const completed = await service.complete(jobId, claim.workerToken);
  assert.equal(completed.status, 'completed');
  assert.equal(job.status, 'completed');
});

test('Step 50 A7 completed re-import cannot acquire a new execution claim', async () => {
  const { service } = make('completed');
  await assert.rejects(() => service.claim(jobId), (error: any) => error?.code === 'EXCEL_IMPORT_REPLAY_BLOCKED');
});

test('Step 50 A7 failed import requires explicit recovery before retry', async () => {
  const { service, job, attempts } = make();
  const first = await service.claim(jobId);
  await service.fail(jobId, first.workerToken, { code: 'EXCEL_APPLY_FAILED', message: 'apply failed' });
  assert.equal(job.status, 'failed');
  await assert.rejects(() => service.claim(jobId), (error: any) => error?.code === 'EXCEL_IMPORT_RECOVERY_REQUIRED');
  const recovered = await service.recover(jobId, 'operator reviewed failure evidence');
  assert.equal(recovered.nextAttemptNo, 2);
  assert.equal(job.status, 'pending');
  assert.equal(attempts[0]?.recovery_note, 'operator reviewed failure evidence');
  const second = await service.claim(jobId);
  assert.equal(second.attemptNo, 2);
});

test('Step 50 A7 recovery is bounded to three attempts and is not replayable', async () => {
  const { service, job, attempts } = make('failed');
  attempts.push({ id: uuid('3'), job_id: jobId, attempt_no: 3, worker_token: uuid('4'), status: 'failed', started_at: new Date(), ended_at: new Date(), failure_code: 'EXCEL_APPLY_FAILED', failure_message: 'apply failed', recovery_note: null });
  await assert.rejects(() => service.recover(jobId, 'reviewed failure evidence'), (error: any) => error?.code === 'EXCEL_IMPORT_RETRY_LIMIT');
  assert.equal(job.status, 'failed');
});

test('Step 50 A7 migration is forward-only, append-only for attempts and concurrency guarded', () => {
  const migration = readFileSync('database/migrations/0056_excel_import_recovery.sql', 'utf8');
  const repository = readFileSync('src/modules/excel/infrastructure/import-recovery.repository.ts', 'utf8');
  assert.match(migration, /CREATE TABLE excel\.import_job_attempts/);
  assert.match(migration, /UNIQUE \(job_id,attempt_no\)/);
  assert.match(migration, /WHERE status='processing'/);
  assert.match(repository, /FOR UPDATE/);
  assert.match(repository, /worker_token/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DROP COLUMN/i);
  assert.doesNotMatch(migration + repository, /UPDATE catalog\.|UPDATE pricing\.|INSERT INTO catalog\.|INSERT INTO pricing\./i);
});
