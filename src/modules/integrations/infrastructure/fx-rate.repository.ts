import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { FxRateObservation } from '../domain/fx-provider';

@Injectable()
export class FxRateRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async record(input: {
    providerKey: string;
    observation: FxRateObservation;
    fetchedAt: Date;
    providerRequestId?: string | null;
  }): Promise<void> {
    await sql`
      INSERT INTO integrations.fx_rate_observations(
        provider_key, source_currency_code, target_unit, rate_to_toman,
        observed_at, fetched_at, source_reference, provider_request_id
      ) VALUES (
        ${input.providerKey}, ${input.observation.sourceCurrencyCode}, ${input.observation.targetUnit}, ${input.observation.rateToToman},
        ${input.observation.observedAt}, ${input.fetchedAt}, ${input.observation.sourceReference ?? null}, ${input.providerRequestId ?? null}
      )
    `.execute(this.db);
  }

  async latest(providerKey: string, sourceCurrencyCode: string) {
    return (await sql<any>`
      SELECT provider_key, source_currency_code, target_unit, rate_to_toman,
             observed_at, fetched_at, source_reference, provider_request_id
      FROM integrations.fx_rate_observations
      WHERE provider_key=${providerKey} AND source_currency_code=${sourceCurrencyCode}
      ORDER BY observed_at DESC, id DESC
      LIMIT 1
    `.execute(this.db)).rows[0] ?? null;
  }
}
