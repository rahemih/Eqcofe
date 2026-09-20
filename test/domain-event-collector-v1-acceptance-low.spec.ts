import test from 'node:test';
import assert from 'node:assert/strict';
import { DomainEventCollector, type RecordedDomainEvent } from '../src/shared/kernel/domain-event.ts';

class AcceptanceDomainEventCollector extends DomainEventCollector {
  record(event: RecordedDomainEvent): void {
    this.recordEvent(event);
  }
}

function event(id: string, aggregateVersion: number): RecordedDomainEvent {
  return {
    eventType: 'v1.acceptance.low',
    eventVersion: 1,
    aggregateType: 'AcceptanceAggregate',
    aggregateId: id,
    aggregateVersion,
    occurredAt: new Date(`2026-09-20T00:00:0${aggregateVersion}.000Z`),
    payload: { aggregateVersion },
  };
}

test('V1 Acceptance LOW: DomainEventCollector instances remain isolated', () => {
  const left = new AcceptanceDomainEventCollector();
  const right = new AcceptanceDomainEventCollector();
  const leftEvent = event('left', 1);
  const rightEvent = event('right', 1);

  left.record(leftEvent);
  right.record(rightEvent);

  assert.deepEqual(left.pullEvents(), [leftEvent]);
  assert.deepEqual(right.pullEvents(), [rightEvent]);
  assert.deepEqual(left.pullEvents(), []);
  assert.deepEqual(right.pullEvents(), []);
});

test('V1 Acceptance LOW: mutating a pulled batch cannot contaminate later events', () => {
  const collector = new AcceptanceDomainEventCollector();
  const first = event('acceptance', 1);
  const second = event('acceptance', 2);

  collector.record(first);
  const pulled = collector.pullEvents();

  pulled.push(event('external-only', 9));
  pulled.splice(0, pulled.length);

  collector.record(second);

  assert.deepEqual(collector.pullEvents(), [second]);
  assert.deepEqual(collector.pullEvents(), []);
});
