import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { IntegrationProviderKind, ProviderHealthResult } from '../domain/provider-contracts';

@Injectable()
export class ProviderHealthRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async record(input: { providerKey: string; providerKind: IntegrationProviderKind; result: ProviderHealthResult }): Promise<void> {
    await sql`
      INSERT INTO integrations.provider_health_samples(
        provider_key, provider_kind, state, checked_at, latency_ms,
        failure_kind, failure_code, provider_status, provider_request_id, metadata
      ) VALUES (
        ${input.providerKey}, ${input.providerKind}, ${input.result.state}, ${input.result.checkedAt}, ${input.result.latencyMs ?? null},
        ${input.result.failure?.kind ?? null}, ${input.result.failure?.code ?? null}, ${input.result.failure?.providerStatus ?? null},
        ${input.result.failure?.providerRequestId ?? null}, ${JSON.stringify(input.result.metadata ?? {})}::jsonb
      )
    `.execute(this.db);
  }

  async current() {
    return (await sql<any>`
      SELECT DISTINCT ON (provider_key)
        provider_key, provider_kind, state, checked_at, latency_ms,
        failure_kind, failure_code, provider_status, provider_request_id, metadata
      FROM integrations.provider_health_samples
      ORDER BY provider_key, checked_at DESC, id DESC
    `.execute(this.db)).rows;
  }

  async summary(since: Date) {
    return (await sql<any>`
      SELECT provider_key, provider_kind,
        count(*)::int AS checks,
        count(*) FILTER (WHERE state='healthy')::int AS healthy_checks,
        count(*) FILTER (WHERE state='degraded')::int AS degraded_checks,
        count(*) FILTER (WHERE state='unavailable')::int AS unavailable_checks,
        count(*) FILTER (WHERE state='unknown')::int AS unknown_checks,
        round(avg(latency_ms)::numeric, 2) AS avg_latency_ms,
        max(checked_at) AS last_checked_at
      FROM integrations.provider_health_samples
      WHERE checked_at >= ${since}
      GROUP BY provider_key, provider_kind
      ORDER BY provider_kind, provider_key
    `.execute(this.db)).rows;
  }
}
