export const CUSTOMER_NOTIFICATION_RECIPIENT_PORT=Symbol('CUSTOMER_NOTIFICATION_RECIPIENT_PORT');
export interface CustomerNotificationRecipient{
  customerId:string; active:boolean; mobile:string|null; email:string|null;
}
export interface CustomerNotificationRecipientPort{ resolve(customerId:string):Promise<CustomerNotificationRecipient|null>; }
