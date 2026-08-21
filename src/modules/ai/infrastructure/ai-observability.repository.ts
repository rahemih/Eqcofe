import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { TransactionManager } from '../../../platform/database/transaction-manager';
import { AiOperationKind } from '../domain/ai-provider-contracts';

export type AiInvocationOutcome = 'succeeded' | 'provider_failed' | 'application_failed';

@Injectable()
export class AiObservabilityRepository {
  constructor(private readonly tx: TransactionManager) {}

  async append(input: {
    id: string;
    requestId: string;
    operation: AiOperationKind;
    promptKey: string;
    promptVersion: number;
    outcome: AiInvocationOutcome;
    providerFailureKind?: string | null;
    model?: string | null;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs: number;
  }) {
    await sql`INSERT INTO ai.invocation_observations(
      id,request_id,operation,prompt_key,prompt_version,outcome,provider_failure_kind,model,input_tokens,output_tokens,latency_ms
    ) VALUES(
      ${input.id}::uuid,${input.requestId}::uuid,${input.operation},${input.promptKey},${input.promptVersion},${input.outcome},
      ${input.providerFailureKind ?? null},${input.model ?? null},${input.inputTokens ?? 0},${input.outputTokens ?? 0},${input.latencyMs}
    )`.execute(this.tx.readonly());
  }

  async summary(operation: AiOperationKind, hours = 24) {
    const boundedHours = Number.isSafeInteger(hours) && hours >= 1 && hours <= 168 ? hours : 24;
    const result = await sql<{
      total: string | number | bigint;
      succeeded: string | number | bigint;
      provider_failed: string | number | bigint;
      application_failed: string | number | bigint;
      input_tokens: string | number | bigint;
      output_tokens: string | number | bigint;
      avg_latency_ms: string | number | null;
    }>`SELECT
      count(*) AS total,
      count(*) FILTER (WHERE outcome='succeeded') AS succeeded,
      count(*) FILTER (WHERE outcome='provider_failed') AS provider_failed,
      count(*) FILTER (WHERE outcome='application_failed') AS application_failed,
      COALESCE(sum(input_tokens),0) AS input_tokens,
      COALESCE(sum(output_tokens),0) AS output_tokens,
      COALESCE(avg(latency_ms),0) AS avg_latency_ms
    FROM ai.invocation_observations
    WHERE operation=${operation} AND created_at >= now() - (${boundedHours} * interval '1 hour')`.execute(this.tx.readonly());
    const row = result.rows[0]!;
    return {
      total: Number(row.total),
      succeeded: Number(row.succeeded),
      provider_failed: Number(row.provider_failed),
      application_failed: Number(row.application_failed),
      input_tokens: Number(row.input_tokens),
      output_tokens: Number(row.output_tokens),
      avg_latency_ms: Math.round(Number(row.avg_latency_ms ?? 0)),
      hours: boundedHours,
    };
  }
}
