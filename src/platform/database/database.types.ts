import type { ColumnType, Generated } from 'kysely';

export interface OutboxTable {
  id: string;
  event_id: string;
  event_type: string;
  event_version: number;
  aggregate_type: string;
  aggregate_id: string;
  aggregate_version: ColumnType<string, string | number | bigint, string | number | bigint>;
  correlation_id: string | null;
  causation_id: string | null;
  trace_id: string | null;
  payload: unknown;
  status: string;
  available_at: Date;
  published_at: Date | null;
  locked_at: Date | null;
  locked_by: string | null;
  attempt_count: Generated<number>;
  last_error_code: string | null;
  created_at: Generated<Date>;
}

export interface IdempotencyKeyTable {
  id: string;
  scope: string;
  idempotency_key: string;
  request_hash: string;
  response_code: number | null;
  response_body: unknown | null;
  status: string;
  locked_until: Date | null;
  expires_at: Date;
  created_at: Generated<Date>;
  completed_at: Date | null;
}

export interface ConsumerInboxTable {
  consumer_name: string;
  event_id: string;
  event_type: string;
  status: string;
  attempt_count: Generated<number>;
  received_at: Generated<Date>;
  processed_at: Date | null;
  last_error_code: string | null;
}

export interface DatabaseSchema {
  outbox: OutboxTable;
  idempotency_keys: IdempotencyKeyTable;
  consumer_inbox: ConsumerInboxTable;
}
