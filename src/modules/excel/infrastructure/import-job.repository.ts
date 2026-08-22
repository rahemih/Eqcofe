import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { ImportJobStatus } from '../domain/import-job';

export interface ImportJobRow {
  id: string;
  contract_version: string;
  fingerprint: string;
  status: ImportJobStatus;
  requested_by: string;
  created_at: Date;
  completed_at: Date | null;
  failure_code: string | null;
  failure_message: string | null;
}

@Injectable()
export class ImportJobRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async create(ex: DatabaseExecutor, input: { id: string; contractVersion: string; fingerprint: string; requestedBy: string }) {
    const result = await sql<ImportJobRow>`INSERT INTO excel.import_jobs(id,contract_version,fingerprint,requested_by)
      VALUES(${input.id}::uuid,${input.contractVersion},${input.fingerprint},${input.requestedBy}::uuid)
      ON CONFLICT (contract_version,fingerprint) DO NOTHING RETURNING *`.execute(ex);
    return result.rows[0] ?? null;
  }

  async byFingerprint(ex: DatabaseExecutor, contractVersion: string, fingerprint: string, lock = false) {
    const query = lock
      ? sql<ImportJobRow>`SELECT * FROM excel.import_jobs WHERE contract_version=${contractVersion} AND fingerprint=${fingerprint} FOR UPDATE`
      : sql<ImportJobRow>`SELECT * FROM excel.import_jobs WHERE contract_version=${contractVersion} AND fingerprint=${fingerprint}`;
    return (await query.execute(ex)).rows[0] ?? null;
  }

  async byId(ex: DatabaseExecutor, id: string, lock = false) {
    const query = lock
      ? sql<ImportJobRow>`SELECT * FROM excel.import_jobs WHERE id=${id}::uuid FOR UPDATE`
      : sql<ImportJobRow>`SELECT * FROM excel.import_jobs WHERE id=${id}::uuid`;
    return (await query.execute(ex)).rows[0] ?? null;
  }

  async transition(
    ex: DatabaseExecutor,
    input: {
      id: string;
      expectedStatus: ImportJobStatus;
      targetStatus: Exclude<ImportJobStatus, 'pending'>;
      failureCode: string | null;
      failureMessage: string | null;
    },
  ) {
    if (input.targetStatus === 'failed') {
      const result = await sql<ImportJobRow>`UPDATE excel.import_jobs
        SET status='failed',completed_at=now(),failure_code=${input.failureCode},failure_message=${input.failureMessage}
        WHERE id=${input.id}::uuid AND status=${input.expectedStatus} RETURNING *`.execute(ex);
      return result.rows[0] ?? null;
    }
    if (input.targetStatus === 'completed') {
      const result = await sql<ImportJobRow>`UPDATE excel.import_jobs
        SET status='completed',completed_at=now(),failure_code=NULL,failure_message=NULL
        WHERE id=${input.id}::uuid AND status=${input.expectedStatus} RETURNING *`.execute(ex);
      return result.rows[0] ?? null;
    }
    const result = await sql<ImportJobRow>`UPDATE excel.import_jobs
      SET status='processing',completed_at=NULL,failure_code=NULL,failure_message=NULL
      WHERE id=${input.id}::uuid AND status=${input.expectedStatus} RETURNING *`.execute(ex);
    return result.rows[0] ?? null;
  }
}
