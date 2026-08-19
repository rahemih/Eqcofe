import { RecordedDomainEvent } from '../../../shared/kernel/domain-event';

export function customerEvent(
  eventType:string,
  aggregateId:string,
  aggregateVersion:number,
  payload:Record<string,unknown>,
):RecordedDomainEvent{
  return {eventType,eventVersion:1,aggregateType:'customer',aggregateId,aggregateVersion,occurredAt:new Date(),payload};
}

export function customerAddressEvent(eventType:string,addressId:string,addressVersion:number,payload:Record<string,unknown>):RecordedDomainEvent{
  return {eventType,eventVersion:1,aggregateType:'customer_address',aggregateId:addressId,aggregateVersion:addressVersion,occurredAt:new Date(),payload};
}


export function customerWishlistEvent(eventType:string,customerId:string,productId:string):RecordedDomainEvent{
  return {eventType,eventVersion:1,aggregateType:'customer_wishlist',aggregateId:customerId,aggregateVersion:1,occurredAt:new Date(),payload:{customer_id:customerId,product_id:productId}};
}

export function customerWholesaleEvent(eventType:string,applicationId:string,applicationVersion:number,customerId:string,status:string):RecordedDomainEvent{
  return {eventType,eventVersion:1,aggregateType:'customer_wholesale_application',aggregateId:applicationId,aggregateVersion:applicationVersion,occurredAt:new Date(),payload:{application_id:applicationId,customer_id:customerId,status}};
}
