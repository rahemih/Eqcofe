import { RecordedDomainEvent } from '../../../shared/kernel/domain-event';

export function campaignEvent(
  eventType: string,
  id: string,
  version: number,
  payload: Record<string, unknown>,
): RecordedDomainEvent {
  return {
    eventType,
    eventVersion: 1,
    aggregateType: 'marketing_campaign',
    aggregateId: id,
    aggregateVersion: version,
    occurredAt: new Date(),
    payload,
  };
}
