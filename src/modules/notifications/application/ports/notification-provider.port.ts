export type OutboundNotificationChannel='sms'|'email';
export interface NotificationProviderMessage{deliveryId:string;channel:OutboundNotificationChannel;destination:string;subject:string|null;body:string;idempotencyKey:string;}
export type NotificationProviderResult=
 |{status:'delivered';providerMessageId?:string;metadata?:Record<string,unknown>}
 |{status:'retryable_failure';errorCode:string;errorMessage?:string;metadata?:Record<string,unknown>}
 |{status:'permanent_failure';errorCode:string;errorMessage?:string;metadata?:Record<string,unknown>}
 |{status:'blocked';errorCode:string;errorMessage?:string;metadata?:Record<string,unknown>};
export interface NotificationProviderPort{readonly key:string;readonly channel:OutboundNotificationChannel;send(message:NotificationProviderMessage):Promise<NotificationProviderResult>;}
