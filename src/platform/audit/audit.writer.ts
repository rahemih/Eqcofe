import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql, Transaction } from 'kysely';
import { KYSELY_DB } from '../database/database.tokens';
import { DatabaseSchema } from '../database/database.types';

export interface AuditEntry {
  actorType: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  beforeData?: unknown;
  afterData?: unknown;
  reason?: string;
  ipAddress?: string;
  requestId?: string;
  traceId?: string;
}

type Executor = Kysely<DatabaseSchema> | Transaction<DatabaseSchema>;

@Injectable()
export class AuditWriter {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  write(entry: AuditEntry): Promise<void> { return this.writeWith(this.db, entry); }

  async writeWith(executor: Executor, entry: AuditEntry): Promise<void> {
    await sql`INSERT INTO audit.audit_logs(actor_type,actor_id,action,resource_type,resource_id,before_data,after_data,reason,ip_address,request_id,trace_id)
      VALUES (${entry.actorType},${entry.actorId??null}::uuid,${entry.action},${entry.resourceType},${entry.resourceId??null}::uuid,
      ${entry.beforeData===undefined?null:JSON.stringify(entry.beforeData)}::jsonb,${entry.afterData===undefined?null:JSON.stringify(entry.afterData)}::jsonb,
      ${entry.reason??null},${entry.ipAddress??null}::inet,${entry.requestId??null},${entry.traceId??null})`.execute(executor);
  }
}
