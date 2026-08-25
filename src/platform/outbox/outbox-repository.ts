import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { DatabaseSchema } from '../database/database.types';
import { KYSELY_DB } from '../database/database.tokens';

export interface ClaimedOutboxEvent {
  id: string; event_id: string; event_type: string; event_version: number;
  aggregate_type: string; aggregate_id: string; aggregate_version: string;
  correlation_id: string | null; causation_id: string | null; trace_id: string | null;
  payload: unknown; attempt_count: number;
}

@Injectable()
export class OutboxRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async claimBatch(workerId: string, limit: number, staleBefore: Date): Promise<ClaimedOutboxEvent[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) throw new Error('OUTBOX_BATCH_SIZE_INVALID');
    if (Number.isNaN(staleBefore.getTime())) throw new Error('OUTBOX_STALE_BEFORE_INVALID');
    return this.db.transaction().execute(async (trx) => {
      const result = await sql<ClaimedOutboxEvent>`
        WITH candidates AS (
          SELECT id
          FROM events.outbox
          WHERE (
            (status = 'pending' AND available_at <= now())
            OR (status = 'processing' AND locked_at < ${staleBefore})
          )
          ORDER BY created_at
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE events.outbox o
        SET status = 'processing', locked_at = now(), locked_by = ${workerId},
            attempt_count = o.attempt_count + 1, last_error_code = NULL
        FROM candidates c
        WHERE o.id = c.id
        RETURNING o.id, o.event_id, o.event_type, o.event_version, o.aggregate_type,
                  o.aggregate_id, o.aggregate_version::text, o.correlation_id,
                  o.causation_id, o.trace_id, o.payload, o.attempt_count
      `.execute(trx);
      return result.rows;
    });
  }

  async markPublished(id: string): Promise<void> {
    await this.db.withSchema('events').updateTable('outbox').set({
      status: 'published', published_at: new Date(), locked_at: null, locked_by: null,
    }).where('id', '=', id).execute();
  }

  async markFailed(id: string, errorCode: string, deadLetter: boolean, delayMs: number): Promise<void> {
    await this.db.withSchema('events').updateTable('outbox').set({
      status: deadLetter ? 'dead_letter' : 'pending',
      available_at: new Date(Date.now() + delayMs),
      locked_at: null, locked_by: null, last_error_code: errorCode.slice(0, 120),
    }).where('id', '=', id).execute();
  }
}
