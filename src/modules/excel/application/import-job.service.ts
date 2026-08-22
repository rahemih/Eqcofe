import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import {
  ImportJobError,
  ImportJobFailure,
  ImportJobState,
  ImportJobStatus,
  transitionImportJob,
} from '../domain/import-job';
import { ParsedWorkbook } from '../domain/workbook-contract';
import { createWorkbookFingerprint } from '../domain/workbook-fingerprint';
import { ImportJobRepository, ImportJobRow } from '../infrastructure/import-job.repository';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ImportJobCreateResult {
  job: ImportJobRow;
  created: boolean;
  replay: boolean;
}

@Injectable()
export class ImportJobService {
  constructor(
    private readonly tx: TransactionManager,
    private readonly jobs: ImportJobRepository,
  ) {}

  async create(input: { workbook: ParsedWorkbook; requestedBy: unknown }): Promise<ImportJobCreateResult> {
    const requestedBy = this.uuid(input.requestedBy, 'EXCEL_IMPORT_REQUESTER_INVALID');
    const contractVersion = input.workbook.contractVersion;
    const fingerprint = createWorkbookFingerprint(input.workbook);
    return this.tx.run(async (ex) => {
      const created = await this.jobs.create(ex, {
        id: randomUUID(),
        contractVersion,
        fingerprint,
        requestedBy,
      });
      if (created) return { job: created, created: true, replay: false };

      const existing = await this.jobs.byFingerprint(ex, contractVersion, fingerprint, true);
      if (!existing) {
        throw new ImportJobError('EXCEL_IMPORT_IDEMPOTENCY_RACE', 'نتیجه همزمانی import job قابل بازیابی نیست.');
      }
      if (existing.requested_by !== requestedBy) {
        throw new ImportJobError('EXCEL_IMPORT_FINGERPRINT_CONFLICT', 'این محتوای workbook قبلاً توسط درخواست دیگری ثبت شده است.');
      }
      return { job: existing, created: false, replay: true };
    });
  }

  begin(idInput: unknown): Promise<ImportJobRow> {
    return this.move(idInput, 'processing');
  }

  complete(idInput: unknown): Promise<ImportJobRow> {
    return this.move(idInput, 'completed');
  }

  fail(idInput: unknown, failure: ImportJobFailure): Promise<ImportJobRow> {
    return this.move(idInput, 'failed', failure);
  }

  private async move(
    idInput: unknown,
    targetStatus: Exclude<ImportJobStatus, 'pending'>,
    failure?: ImportJobFailure,
  ): Promise<ImportJobRow> {
    const id = this.uuid(idInput, 'EXCEL_IMPORT_JOB_ID_INVALID');
    return this.tx.run(async (ex) => {
      const current = await this.jobs.byId(ex, id, true);
      if (!current) throw new ImportJobError('EXCEL_IMPORT_JOB_NOT_FOUND', 'Import job پیدا نشد.');
      const next = transitionImportJob(this.state(current), targetStatus, failure);
      if (current.status === targetStatus) return current;

      const saved = await this.jobs.transition(ex, {
        id,
        expectedStatus: current.status,
        targetStatus,
        failureCode: next.failureCode,
        failureMessage: next.failureMessage,
      });
      if (saved) return saved;

      const raced = await this.jobs.byId(ex, id, true);
      if (raced?.status === targetStatus) {
        transitionImportJob(this.state(raced), targetStatus, failure);
        return raced;
      }
      throw new ImportJobError('EXCEL_IMPORT_STATE_CONFLICT', 'وضعیت import job همزمان تغییر کرده است.');
    });
  }

  private state(row: ImportJobRow): ImportJobState {
    return {
      status: row.status,
      completedAt: row.completed_at,
      failureCode: row.failure_code,
      failureMessage: row.failure_message,
    };
  }

  private uuid(value: unknown, code: string): string {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!UUID_RE.test(normalized)) throw new ImportJobError(code, 'شناسه import job معتبر نیست.');
    return normalized;
  }
}
