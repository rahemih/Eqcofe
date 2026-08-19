import { RecordedDomainEvent } from '../../../shared/kernel/domain-event';
export function warrantyEvent(eventType:string,aggregateId:string,aggregateVersion:number,payload:Record<string,unknown>):RecordedDomainEvent{
  return{eventType,eventVersion:1,aggregateType:'warranty_claim',aggregateId,aggregateVersion,occurredAt:new Date(),payload};
}
