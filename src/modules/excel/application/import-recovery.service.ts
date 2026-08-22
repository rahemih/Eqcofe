import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { ImportJobError, ImportJobFailure } from '../domain/import-job';
import { ImportJobRepository } from '../infrastructure/import-job.repository';
import { ImportAttemptRow, ImportRecoveryRepository } from '../infrastructure/import-recovery.repository';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ATTEMPTS = 3;

export interface ImportExecutionClaim {
  jobId: string;
  attemptId: string;
  attemptNo: number;
  workerToken: string;
}

@Injectable()
export class ImportRecoveryService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly jobs: ImportJobRepository,
    private readonly recovery: ImportRecoveryRepository,
  ) {}

  async claim(jobIdInput: unknown): Promise<ImportExecutionClaim> {
    const jobId = this.uuid(jobIdInput, 'EXCEL_IMPORT_JOB_ID_INVALID');
    return this.tx.run(async (ex) => {
      const job = await this.recovery.lockJob(ex, jobId);
      if (!job) throw new ImportJobError('EXCEL_IMPORT_JOB_NOT_FOUND', 'Import job پیدا نشد.');
      if (job.status === 'completed') throw new ImportJobError('EXCEL_IMPORT_REPLAY_BLOCKED', 'Import تکمیل‌شده قابل اجرای دوباره نیست.');
      if (job.status === 'failed') throw new ImportJobError('EXCEL_IMPORT_RECOVERY_REQUIRED', 'Import شکست‌خورده قبل از اجرای دوباره نیازمند Recovery صریح است.');
      if (job.status !== 'pending') throw new ImportJobError('EXCEL_IMPORT_ALREADY_PROCESSING', 'Import job هم‌اکنون در حال پردازش است.');
      if (await this.recovery.activeAttempt(ex, jobId)) throw new ImportJobError('EXCEL_IMPORT_ALREADY_PROCESSING', 'برای این Import job یک اجرای فعال وجود دارد.');

      const latest = await this.recovery.latestAttempt(ex, jobId);
      const attemptNo = Number(latest?.attempt_no ?? 0) + 1;
      if (attemptNo > MAX_ATTEMPTS) throw new ImportJobError('EXCEL_IMPORT_RETRY_LIMIT', 'حداکثر تعداد تلاش Import مصرف شده است.');

      const moved = await this.jobs.transition(ex, {
        id: jobId,
        expectedStatus: 'pending',
        targetStatus: 'processing',
        failureCode: null,
        failureMessage: null,
      });
      if (!moved) throw new ImportJobError('EXCEL_IMPORT_STATE_CONFLICT', 'وضعیت Import job همزمان تغییر کرده است.');

      const attemptId = randomUUID();
      const workerToken = randomUUID();
      await this.recovery.insertAttempt(ex, { id: attemptId, jobId, attemptNo, workerToken });
      return { jobId, attemptId, attemptNo, workerToken };
    });
  }

  async complete(jobIdInput: unknown, workerTokenInput: unknown): Promise<ImportAttemptRow> {
    return this.finish(jobIdInput, workerTokenInput, 'completed');
  }

  async fail(jobIdInput: unknown, workerTokenInput: unknown, failure: ImportJobFailure): Promise<ImportAttemptRow> {
    const normalized = this.failure(failure);
    return this.finish(jobIdInput, workerTokenInput, 'failed', normalized);
  }

  async recover(jobIdInput: unknown, noteInput: unknown): Promise<{ jobId: string; nextAttemptNo: number }> {
    const jobId = this.uuid(jobIdInput, 'EXCEL_IMPORT_JOB_ID_INVALID');
    const note = this.note(noteInput);
    return this.tx.run(async (ex) => {
      const job = await this.recovery.lockJob(ex, jobId);
      if (!job) throw new ImportJobError('EXCEL_IMPORT_JOB_NOT_FOUND', 'Import job پیدا نشد.');
      if (job.status === 'completed') throw new ImportJobError('EXCEL_IMPORT_REPLAY_BLOCKED', 'Import تکمیل‌شده Recovery نمی‌شود.');
      if (job.status === 'processing') throw new ImportJobError('EXCEL_IMPORT_ALREADY_PROCESSING', 'Import در حال پردازش قابل Recovery نیست.');
      if (job.status !== 'failed') throw new ImportJobError('EXCEL_IMPORT_RECOVERY_NOT_ALLOWED', 'فقط Import شکست‌خورده قابل Recovery است.');

      const latest = await this.recovery.latestAttempt(ex, jobId);
      if (!latest || latest.status !== 'failed') throw new ImportJobError('EXCEL_IMPORT_RECOVERY_EVIDENCE_MISSING', 'Evidence تلاش شکست‌خورده برای Recovery موجود نیست.');
      if (Number(latest.attempt_no) >= MAX_ATTEMPTS) throw new ImportJobError('EXCEL_IMPORT_RETRY_LIMIT', 'حداکثر تعداد تلاش Import مصرف شده است.');
      if (latest.recovery_note) throw new ImportJobError('EXCEL_IMPORT_RECOVERY_REPLAY', 'Recovery این تلاش قبلاً ثبت شده است.');

      const recorded = await this.recovery.recordRecovery(ex, { jobId, attemptNo: Number(latest.attempt_no), note });
      if (!recorded) throw new ImportJobError('EXCEL_IMPORT_STATE_CONFLICT', 'Recovery همزمان تغییر کرده است.');
      const reset = await this.recovery.resetFailedJob(ex, jobId);
      if (!reset) throw new ImportJobError('EXCEL_IMPORT_STATE_CONFLICT', 'Import job برای Recovery قابل بازنشانی نیست.');
      return { jobId, nextAttemptNo: Number(latest.attempt_no) + 1 };
    });
  }

  private async finish(
    jobIdInput: unknown,
    workerTokenInput: unknown,
    status: 'completed' | 'failed',
    failure?: ImportJobFailure,
  ): Promise<ImportAttemptRow> {
    const jobId = this.uuid(jobIdInput, 'EXCEL_IMPORT_JOB_ID_INVALID');
    const workerToken = this.uuid(workerTokenInput, 'EXCEL_IMPORT_WORKER_TOKEN_INVALID');
    return this.tx.run(async (ex) => {
      const job = await this.recovery.lockJob(ex, jobId);
      if (!job) throw new ImportJobError('EXCEL_IMPORT_JOB_NOT_FOUND', 'Import job پیدا نشد.');
      if (job.status !== 'processing') throw new ImportJobError('EXCEL_IMPORT_STATE_CONFLICT', 'Import job در وضعیت processing نیست.');
      const active = await this.recovery.activeAttempt(ex, jobId);
      if (!active || active.worker_token !== workerToken) throw new ImportJobError('EXCEL_IMPORT_WORKER_TOKEN_CONFLICT', 'توکن اجرای Import معتبر نیست.');

      const attempt = await this.recovery.finishAttempt(ex, {
        jobId,
        workerToken,
        status,
        failureCode: failure?.code ?? null,
        failureMessage: failure?.message ?? null,
      });
      if (!attempt) throw new ImportJobError('EXCEL_IMPORT_STATE_CONFLICT', 'تلاش Import همزمان تغییر کرده است.');
      const moved = await this.jobs.transition(ex, {
        id: jobId,
        expectedStatus: 'processing',
        targetStatus: status,
        failureCode: failure?.code ?? null,
        failureMessage: failure?.message ?? null,
      });
      if (!moved) throw new ImportJobError('EXCEL_IMPORT_STATE_CONFLICT', 'وضعیت Import job همزمان تغییر کرده است.');
      return attempt;
    });
  }

  private uuid(value: unknown, code: string): string {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!UUID_RE.test(normalized)) throw new ImportJobError(code, 'شناسه معتبر نیست.');
    return normalized;
  }

  private note(value: unknown): string {
    const note = String(value ?? '').normalize('NFKC').trim();
    if (note.length < 3 || note.length > 500 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(note)) {
      throw new ImportJobError('EXCEL_IMPORT_RECOVERY_NOTE_INVALID', 'یادداشت Recovery معتبر نیست.');
    }
    return note;
  }

  private failure(value: ImportJobFailure): ImportJobFailure {
    const code = String(value?.code ?? '').normalize('NFKC').trim().toUpperCase();
    const message = String(value?.message ?? '').normalize('NFKC').trim();
    if (!/^[A-Z][A-Z0-9_]{2,119}$/.test(code)) throw new ImportJobError('EXCEL_IMPORT_FAILURE_CODE_INVALID', 'کد شکست معتبر نیست.');
    if (message.length < 1 || message.length > 1000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(message)) {
      throw new ImportJobError('EXCEL_IMPORT_FAILURE_MESSAGE_INVALID', 'پیام شکست معتبر نیست.');
    }
    return { code, message };
  }
}
