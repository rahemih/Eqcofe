import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RecordedDomainEvent } from '../../shared/kernel/domain-event';
import { ExecutionContext } from '../../shared/application/execution-context';
import { DatabaseExecutor } from '../database/transaction-manager';

@Injectable()
export class OutboxWriter {
  async append(executor: DatabaseExecutor, events: readonly RecordedDomainEvent[], context: ExecutionContext): Promise<void> {
    if (events.length === 0) return;
    await executor.withSchema('events').insertInto('outbox').values(
      events.map((event) => ({
        id: randomUUID(), event_id: randomUUID(), event_type: event.eventType,
        event_version: event.eventVersion, aggregate_type: event.aggregateType,
        aggregate_id: event.aggregateId, aggregate_version: event.aggregateVersion,
        correlation_id: context.correlationId, causation_id: context.causationId ?? null,
        trace_id: context.traceId ?? null, payload: event.payload, status: 'pending',
        available_at: new Date(), published_at: null, locked_at: null, locked_by: null,
        last_error_code: null,
      })),
    ).execute();
  }
}
