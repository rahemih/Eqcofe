import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';

export interface ImportAttemptRow {
  id: string;
  job_id: string;
  attempt_no: number;
  worker_token: string;
  status: 'processing' | 'completed' | 'failed' | 'abandoned';
  started_at: Date;
  ended_at: Date | null;
  failure_code: string | null;
  failure_message: string | null;
  recovery_note: string | null;
}

@Injectable()
export class ImportRecoveryRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async lockJob(ex: DatabaseExecutor, jobId: string) {
    const result = await sql<any>`SELECT * FROM excel.import_jobs WHERE id=${jobId}::uuid FOR UPDATE`.execute(ex);
    return result.rows[0] ?? null;
  }

  async activeAttempt(ex: DatabaseExecutor, jobId: string) {
    const result = await sql<ImportAttemptRow>`SELECT * FROM excel.import_job_attempts WHERE job_id=${jobId}::uuid AND status='processing' FOR UPDATE`.execute(ex);
    return result.rows[0] ?? null;
  }

  async latestAttempt(ex: DatabaseExecutor, jobId: string) {
    const result = await sql<ImportAttemptRow>`SELECT * FROM excel.import_job_attempts WHERE job_id=${jobId}::uuid ORDER BY attempt_no DESC LIMIT 1 FOR UPDATE`.execute(ex);
    return result.rows[0] ?? null;
  }

  async insertAttempt(ex: DatabaseExecutor, input: { id: string; jobId: string; attemptNo: number; workerToken: string }) {
    const result = await sql<ImportAttemptRow>`INSERT INTO excel.import_job_attempts(id,job_id,attempt_no,worker_token,status)
      VALUES(${input.id}::uuid,${input.jobId}::uuid,${input.attemptNo},${input.workerToken}::uuid,'processing') RETURNING *`.execute(ex);
    return result.rows[0]!;
  }

  async finishAttempt(ex: DatabaseExecutor, input: { jobId: string; workerToken: string; status: 'completed' | 'failed'; failureCode?: string | null; failureMessage?: string | null }) {
    const result = await sql<ImportAttemptRow>`UPDATE excel.import_job_attempts
      SET status=${input.status},ended_at=now(),failure_code=${input.failureCode ?? null},failure_message=${input.failureMessage ?? null}
      WHERE job_id=${input.jobId}::uuid AND worker_token=${input.workerToken}::uuid AND status='processing' RETURNING *`.execute(ex);
    return result.rows[0] ?? null;
  }

  async recordRecovery(ex: DatabaseExecutor, input: { jobId: string; attemptNo: number; note: string }) {
    const result = await sql<ImportAttemptRow>`UPDATE excel.import_job_attempts
      SET recovery_note=${input.note}
      WHERE job_id=${input.jobId}::uuid AND attempt_no=${input.attemptNo} AND status='failed' AND recovery_note IS NULL RETURNING *`.execute(ex);
    return result.rows[0] ?? null;
  }

  async resetFailedJob(ex: DatabaseExecutor, jobId: string) {
    const result = await sql<any>`UPDATE excel.import_jobs
      SET status='pending',completed_at=NULL,failure_code=NULL,failure_message=NULL
      WHERE id=${jobId}::uuid AND status='failed' RETURNING *`.execute(ex);
    return result.rows[0] ?? null;
  }
}
