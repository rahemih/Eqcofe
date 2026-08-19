import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Kysely } from 'kysely';
import { ConflictError } from '../../shared/errors/app-error';
import { DatabaseSchema } from '../database/database.types';
import { KYSELY_DB } from '../database/database.tokens';

export interface IdempotencyClaim { readonly replay: boolean; readonly responseCode?: number; readonly responseBody?: unknown; }

@Injectable()
export class IdempotencyService {
  private static readonly LEASE_MS = 5 * 60 * 1000;
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  hashRequest(method: string, path: string, body: unknown): string {
    return createHash('sha256').update(`${method}
${path}
${stableStringify(body)}`).digest('hex');
  }

  async claim(scope: string, key: string, requestHash: string): Promise<IdempotencyClaim> {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + IdempotencyService.LEASE_MS);
    const inserted = await this.db.withSchema('events').insertInto('idempotency_keys').values({
      id: randomUUID(), scope, idempotency_key: key, request_hash: requestHash,
      response_code: null, response_body: null, status: 'running', locked_until: lockedUntil,
      expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000), completed_at: null,
    }).onConflict((oc) => oc.columns(['scope','idempotency_key']).doNothing()).returning(['id']).executeTakeFirst();
    if (inserted) return { replay: false };

    const existing = await this.db.withSchema('events').selectFrom('idempotency_keys')
      .select(['request_hash','status','response_code','response_body','locked_until'])
      .where('scope','=',scope).where('idempotency_key','=',key).executeTakeFirstOrThrow();
    if (existing.request_hash !== requestHash) {
      throw new ConflictError('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST', 'کلید تکرارپذیری با درخواست متفاوت استفاده شده است.');
    }
    if (existing.status === 'completed') return { replay: true, responseCode: existing.response_code ?? 200, responseBody: existing.response_body };

    if (existing.status === 'running' && existing.locked_until !== null && existing.locked_until < now) {
      throw new ConflictError('IDEMPOTENCY_OUTCOME_UNKNOWN', 'نتیجه اجرای قبلی نامشخص است و برای جلوگیری از اجرای تکراری باید بررسی شود.');
    }
    const reclaimable = existing.status === 'failed';
    if (reclaimable) {
      const result = await this.db.withSchema('events').updateTable('idempotency_keys').set({ status:'running', locked_until:lockedUntil })
        .where('scope','=',scope).where('idempotency_key','=',key).where('request_hash','=',requestHash)
        .where('status','=','failed').executeTakeFirst();
      if (Number(result.numUpdatedRows) === 1) return { replay: false };
    }
    throw new ConflictError('IDEMPOTENCY_REQUEST_IN_PROGRESS', 'این درخواست هم‌اکنون در حال پردازش است.');
  }

  async complete(scope: string, key: string, responseCode: number, responseBody: unknown): Promise<void> {
    await this.db.withSchema('events').updateTable('idempotency_keys').set({
      status:'completed', response_code:responseCode, response_body:responseBody, completed_at:new Date(), locked_until:null,
    }).where('scope','=',scope).where('idempotency_key','=',key).execute();
  }

  async markDefinitelyFailed(scope: string, key: string): Promise<void> {
    await this.db.withSchema('events').updateTable('idempotency_keys').set({ status:'failed', locked_until:null })
      .where('scope','=',scope).where('idempotency_key','=',key).where('status','=','running').execute();
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(',')}}`;
}
