import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor, TransactionManager } from '../../../platform/database/transaction-manager';
import { AiOperationKind } from '../domain/ai-provider-contracts';

export interface AiUsagePolicyRow {
  operation: AiOperationKind;
  enabled: boolean;
  max_requests_per_minute: number;
  max_input_tokens_per_request: number;
  max_output_tokens_per_request: number;
  daily_budget_micros: string | number | bigint;
  input_cost_micros_per_1k: number;
  output_cost_micros_per_1k: number;
  version: string | number | bigint;
}

@Injectable()
export class AiUsageRepository {
  constructor(private readonly tx: TransactionManager) {}

  async reserve(input: {
    requestId: string;
    operation: AiOperationKind;
    estimatedInputTokens: number;
    reservedOutputTokens: number;
  }) {
    return this.tx.run(async (ex) => {
      const policyResult = await sql<AiUsagePolicyRow>`SELECT * FROM ai.usage_policies WHERE operation=${input.operation} FOR UPDATE`.execute(ex);
      const policy = policyResult.rows[0];
      if (!policy) return { ok: false as const, reason: 'policy_missing' as const };
      if (!policy.enabled) return { ok: false as const, reason: 'disabled' as const };
      if (input.estimatedInputTokens > policy.max_input_tokens_per_request) return { ok: false as const, reason: 'input_limit' as const };
      if (input.reservedOutputTokens > policy.max_output_tokens_per_request) return { ok: false as const, reason: 'output_limit' as const };

      const reservedCostMicros = this.costMicros(
        input.estimatedInputTokens,
        input.reservedOutputTokens,
        policy.input_cost_micros_per_1k,
        policy.output_cost_micros_per_1k,
      );
      const window = await sql<{ minute_count: string | number | bigint; day_cost: string | number | bigint }>`
        SELECT
          COUNT(*) FILTER (WHERE minute_bucket=date_trunc('minute',now())) AS minute_count,
          COALESCE(SUM(CASE WHEN state='settled' THEN actual_cost_micros ELSE reserved_cost_micros END),0) AS day_cost
        FROM ai.usage_reservations
        WHERE operation=${input.operation} AND day_bucket=(now() AT TIME ZONE 'UTC')::date
      `.execute(ex);
      const minuteCount = Number(window.rows[0]?.minute_count ?? 0);
      const dayCost = BigInt(window.rows[0]?.day_cost ?? 0);
      if (minuteCount >= policy.max_requests_per_minute) return { ok: false as const, reason: 'rate_limit' as const };
      if (dayCost + BigInt(reservedCostMicros) > BigInt(policy.daily_budget_micros)) return { ok: false as const, reason: 'budget_limit' as const };

      await sql`INSERT INTO ai.usage_reservations(request_id,operation,minute_bucket,day_bucket,estimated_input_tokens,reserved_output_tokens,reserved_cost_micros)
        VALUES(${input.requestId}::uuid,${input.operation},date_trunc('minute',now()),(now() AT TIME ZONE 'UTC')::date,${input.estimatedInputTokens},${input.reservedOutputTokens},${reservedCostMicros})`.execute(ex);
      return { ok: true as const, reservedCostMicros };
    });
  }

  async settle(input: { requestId: string; inputTokens: number; outputTokens: number; failed?: boolean }) {
    return this.tx.run(async (ex) => {
      const row = await sql<any>`SELECT r.*,p.input_cost_micros_per_1k,p.output_cost_micros_per_1k FROM ai.usage_reservations r JOIN ai.usage_policies p ON p.operation=r.operation WHERE r.request_id=${input.requestId}::uuid FOR UPDATE`.execute(ex);
      const current = row.rows[0];
      if (!current || current.state !== 'reserved') return false;
      const actualCost = input.failed ? 0 : this.costMicros(input.inputTokens,input.outputTokens,current.input_cost_micros_per_1k,current.output_cost_micros_per_1k);
      await sql`UPDATE ai.usage_reservations SET state=${input.failed ? 'failed' : 'settled'},actual_input_tokens=${input.inputTokens},actual_output_tokens=${input.outputTokens},actual_cost_micros=${actualCost},settled_at=now() WHERE request_id=${input.requestId}::uuid AND state='reserved'`.execute(ex);
      return true;
    });
  }

  private costMicros(inputTokens:number,outputTokens:number,inputRate:number,outputRate:number){
    return Math.ceil((inputTokens * inputRate + outputTokens * outputRate) / 1000);
  }
}
