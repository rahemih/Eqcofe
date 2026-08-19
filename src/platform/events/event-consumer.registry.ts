import { Injectable } from '@nestjs/common';
import { ConsumerInboxService } from './consumer-inbox.service';
import { EventConsumer, IntegrationEvent } from './integration-event';

@Injectable()
export class EventConsumerRegistry {
  private readonly consumers = new Map<string, EventConsumer>();
  constructor(private readonly inbox: ConsumerInboxService) {}

  register(consumer: EventConsumer): void {
    if (this.consumers.has(consumer.consumerName)) throw new Error(`Duplicate event consumer: ${consumer.consumerName}`);
    this.consumers.set(consumer.consumerName, consumer);
  }

  async dispatch(event: IntegrationEvent): Promise<void> {
    const targets = [...this.consumers.values()].filter((consumer) => consumer.eventTypes.includes(event.event_type));
    await Promise.all(targets.map((consumer) => this.inbox.execute(
      consumer.consumerName, event, (trx) => consumer.handle(event, trx),
    )));
  }

  registeredCount(): number { return this.consumers.size; }
}
