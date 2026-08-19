export const NOTIFICATION_RECIPIENT_PORT=Symbol('NOTIFICATION_RECIPIENT_PORT');
export type NotificationSubjectType='customer'|'staff'|'internal';
export interface ResolvedNotificationRecipient{subjectType:NotificationSubjectType;subjectId:string;active:boolean;mobile:string|null;email:string|null;}
export interface NotificationRecipientPort{resolve(subjectType:NotificationSubjectType,subjectId:string):Promise<ResolvedNotificationRecipient|null>;}
