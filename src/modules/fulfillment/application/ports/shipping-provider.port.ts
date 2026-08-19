export type NormalizedShippingStatus='ready'|'handed_over'|'in_transit'|'delivered'|'delivery_failed'|'returned'|'unknown';
export interface ShippingTrackingUpdate{
  externalEventId?:string|null;
  trackingNumber:string;
  providerStatus:string;
  normalizedStatus:NormalizedShippingStatus;
  occurredAt:Date;
  payload:Record<string,unknown>;
}
export interface ShippingProviderPort{
  readonly key:string;
  refresh(input:{trackingNumber:string}):Promise<ShippingTrackingUpdate[]>;
  parseWebhook(input:{headers:Record<string,string|string[]|undefined>;body:unknown;rawBody:Buffer}):Promise<ShippingTrackingUpdate>;
}
