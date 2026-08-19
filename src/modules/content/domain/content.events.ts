import { RecordedDomainEvent } from '../../../shared/kernel/domain-event';

export function contentArticleEvent(
  eventType: string,
  articleId: string,
  aggregateVersion: number,
  payload: Record<string, unknown>,
): RecordedDomainEvent {
  return {
    eventType,
    eventVersion: 1,
    aggregateType: 'content_article',
    aggregateId: articleId,
    aggregateVersion,
    occurredAt: new Date(),
    payload,
  };
}
