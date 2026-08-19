import { RecordedDomainEvent } from '../../../shared/kernel/domain-event';
export function returnEvent(eventType:string,aggregateId:string,aggregateVersion:number,payload:Record<string,unknown>):RecordedDomainEvent{
  return{eventType,eventVersion:1,aggregateType:'return',aggregateId,aggregateVersion,occurredAt:new Date(),payload};
}
