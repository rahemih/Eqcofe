import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { OutboxRepository } from '../../src/platform/outbox/outbox-repository';
import { QueueNames } from '../../src/platform/queue/queue-names';
import { StructuredLogger } from '../../src/platform/observability/structured-logger';

@Injectable()
export class OutboxPublisherService implements OnApplicationBootstrap, OnApplicationShutdown {
  private stopping = false;
  private readonly workerId = `outbox-${randomUUID()}`;

  constructor(
    private readonly config: ConfigService,
    private readonly outbox: OutboxRepository,
    @InjectQueue(QueueNames.DomainEventsCritical) private readonly queue: Queue,
    private readonly logger: StructuredLogger,
  ) {}

  onApplicationBootstrap(): void { void this.loop(); }
  onApplicationShutdown(): void { this.stopping = true; }

  private async loop(): Promise<void> {
    const pollMs = this.config.get<number>('OUTBOX_POLL_INTERVAL_MS', 500);
    while (!this.stopping) {
      await this.tick().catch((error: unknown) => {
        this.logger.error(`outbox tick failed: ${safeError(error)}`);
      });
      await sleep(pollMs);
    }
  }

  private async tick(): Promise<void> {
    const limit = this.config.get<number>('OUTBOX_BATCH_SIZE', 100);
    const timeout = this.config.get<number>('OUTBOX_PROCESSING_TIMEOUT_MS', 30000);
    const maxAttempts = this.config.get<number>('OUTBOX_MAX_ATTEMPTS', 12);
    const events = await this.outbox.claimBatch(this.workerId, limit, new Date(Date.now() - timeout));

    for (const event of events) {
      try {
        await this.queue.add('domain-event', {
          event_id: event.event_id, event_type: event.event_type, event_version: event.event_version,
          aggregate_type: event.aggregate_type, aggregate_id: event.aggregate_id,
          aggregate_version: Number(event.aggregate_version), correlation_id: event.correlation_id,
          causation_id: event.causation_id, trace_id: event.trace_id, payload: event.payload,
        }, { jobId: event.event_id, attempts: 10, backoff: { type: 'exponential', delay: 500 }, removeOnComplete: { count: 10000 }, removeOnFail: { count: 10000 } });
        await this.outbox.markPublished(event.id);
      } catch (error) {
        const dead = event.attempt_count >= maxAttempts;
        const delay = Math.min(60_000, 500 * 2 ** Math.min(event.attempt_count, 7));
        await this.outbox.markFailed(event.id, safeError(error), dead, delay);
      }
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const safeError = (error: unknown) => error instanceof Error ? error.name : 'UNKNOWN_ERROR';
