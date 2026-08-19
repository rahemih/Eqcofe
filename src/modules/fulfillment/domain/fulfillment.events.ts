import { RecordedDomainEvent } from '../../../shared/kernel/domain-event';
export function fulfillmentEvent(eventType:string,aggregateId:string,aggregateVersion:number,payload:Record<string,unknown>):RecordedDomainEvent{
  return{eventType,eventVersion:1,aggregateType:'fulfillment',aggregateId,aggregateVersion,occurredAt:new Date(),payload};
}
