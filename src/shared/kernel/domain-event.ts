export interface RecordedDomainEvent<TPayload = Record<string, unknown>> {
  readonly eventType: string;
  readonly eventVersion: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}

export abstract class DomainEventCollector {
  private readonly recordedEvents: RecordedDomainEvent[] = [];

  protected recordEvent(event: RecordedDomainEvent): void {
    this.recordedEvents.push(event);
  }

  pullEvents(): RecordedDomainEvent[] {
    return this.recordedEvents.splice(0, this.recordedEvents.length);
  }
}
