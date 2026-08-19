import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';

@Injectable()
export class CampaignRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async byId(id: string, ex: DatabaseExecutor = this.db, lock = false) {
    const q = lock
      ? sql<any>`SELECT * FROM marketing.campaigns WHERE id=${id}::uuid FOR UPDATE`
      : sql<any>`SELECT * FROM marketing.campaigns WHERE id=${id}::uuid`;
    return (await q.execute(ex)).rows[0] ?? null;
  }

  async list(status?: string) {
    const q = status
      ? sql<any>`SELECT * FROM marketing.campaigns WHERE status=${status} ORDER BY starts_at DESC,id DESC LIMIT 200`
      : sql<any>`SELECT * FROM marketing.campaigns ORDER BY starts_at DESC,id DESC LIMIT 200`;
    return (await q.execute(this.db)).rows;
  }

  async create(ex: DatabaseExecutor, input: { id: string; name: string; description: string | null; startsAt: Date; endsAt: Date; actorId: string }) {
    const r = await sql<any>`INSERT INTO marketing.campaigns(id,name,description,status,starts_at,ends_at,created_by,updated_by)
      VALUES(${input.id}::uuid,${input.name},${input.description},'draft',${input.startsAt},${input.endsAt},${input.actorId}::uuid,${input.actorId}::uuid)
      RETURNING *`.execute(ex);
    return r.rows[0];
  }

  async transition(ex: DatabaseExecutor, input: { id: string; expectedVersion: number; from: string[]; to: string; actorId: string }) {
    const r = await sql<any>`UPDATE marketing.campaigns SET
      status=${input.to},
      version=version+1,
      updated_by=${input.actorId}::uuid,
      updated_at=now(),
      activated_at=CASE WHEN ${input.to}='active' THEN COALESCE(activated_at,now()) ELSE activated_at END,
      paused_at=CASE WHEN ${input.to}='paused' THEN now() ELSE paused_at END,
      ended_at=CASE WHEN ${input.to}='ended' THEN now() ELSE ended_at END,
      archived_at=CASE WHEN ${input.to}='archived' THEN now() ELSE archived_at END
      WHERE id=${input.id}::uuid AND version=${input.expectedVersion} AND status=ANY(${input.from}::text[])
      RETURNING *`.execute(ex);
    return r.rows[0] ?? null;
  }

  async reschedule(ex: DatabaseExecutor, input: { id: string; expectedVersion: number; startsAt: Date; endsAt: Date; actorId: string }) {
    const r = await sql<any>`UPDATE marketing.campaigns SET starts_at=${input.startsAt},ends_at=${input.endsAt},version=version+1,updated_by=${input.actorId}::uuid,updated_at=now()
      WHERE id=${input.id}::uuid AND version=${input.expectedVersion} AND status IN ('draft','paused') RETURNING *`.execute(ex);
    return r.rows[0] ?? null;
  }
}
