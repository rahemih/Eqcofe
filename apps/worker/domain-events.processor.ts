import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueNames } from '../../src/platform/queue/queue-names';
import { EventConsumerRegistry } from '../../src/platform/events/event-consumer.registry';
import { IntegrationEvent } from '../../src/platform/events/integration-event';
import { StructuredLogger } from '../../src/platform/observability/structured-logger';

@Processor(QueueNames.DomainEventsCritical, { concurrency: 10 })
export class DomainEventsProcessor extends WorkerHost {
  constructor(private readonly registry: EventConsumerRegistry, private readonly logger: StructuredLogger) { super(); }
  async process(job: Job<IntegrationEvent>): Promise<void> {
    if (!job.data?.event_id || !job.data?.event_type) throw new Error('INVALID_EVENT_ENVELOPE');
    await this.registry.dispatch(job.data);
    this.logger.log(`domain event dispatched: ${job.data.event_type}`);
  }
}
