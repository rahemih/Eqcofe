import { RecordedDomainEvent } from '../../../shared/kernel/domain-event';
export function financeEvent(eventType:string,aggregateType:string,aggregateId:string,aggregateVersion:number,payload:Record<string,unknown>):RecordedDomainEvent{
  return{eventType,eventVersion:1,aggregateType,aggregateId,aggregateVersion,occurredAt:new Date(),payload};
}
