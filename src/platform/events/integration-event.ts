import { Transaction } from 'kysely';
import { DatabaseSchema } from '../database/database.types';

export interface IntegrationEvent<TPayload = unknown> {
  event_id: string; event_type: string; event_version: number;
  aggregate_type: string; aggregate_id: string; aggregate_version: number;
  correlation_id: string | null; causation_id: string | null; trace_id: string | null;
  payload: TPayload;
}

export interface EventConsumer {
  readonly consumerName: string;
  readonly eventTypes: readonly string[];
  handle(event: IntegrationEvent, trx: Transaction<DatabaseSchema>): Promise<void>;
}
