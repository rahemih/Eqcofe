import test from 'node:test';
import assert from 'node:assert/strict';
import { DomainEventCollector, type RecordedDomainEvent } from '../src/shared/kernel/domain-event.ts';

class TestDomainEventCollector extends DomainEventCollector {
  record(event: RecordedDomainEvent): void {
    this.recordEvent(event);
  }
}

function event(id: string, aggregateVersion: number): RecordedDomainEvent {
  return {
    eventType: 'pilot.low.test',
    eventVersion: 1,
    aggregateType: 'PilotAggregate',
    aggregateId: id,
    aggregateVersion,
    occurredAt: new Date(`2026-09-16T00:00:0${aggregateVersion}.000Z`),
    payload: { aggregateVersion },
  };
}

test('Pilot LOW: DomainEventCollector preserves FIFO order and drains recorded events', () => {
  const collector = new TestDomainEventCollector();
  const first = event('pilot-1', 1);
  const second = event('pilot-1', 2);

  collector.record(first);
  collector.record(second);

  assert.deepEqual(collector.pullEvents(), [first, second]);
  assert.deepEqual(collector.pullEvents(), []);
});

test('Pilot LOW: DomainEventCollector isolates events recorded after a drain', () => {
  const collector = new TestDomainEventCollector();
  const beforeDrain = event('pilot-2', 1);
  const afterDrain = event('pilot-2', 2);

  collector.record(beforeDrain);
  assert.deepEqual(collector.pullEvents(), [beforeDrain]);

  collector.record(afterDrain);
  assert.deepEqual(collector.pullEvents(), [afterDrain]);
  assert.deepEqual(collector.pullEvents(), []);
});
